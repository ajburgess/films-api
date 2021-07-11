import express from 'express';
import fs from 'fs';
import csv from 'neat-csv';
import marked from 'marked';
import cryptoRandomString from 'crypto-random-string';

const app = express();
app.use(express.json());
app.set('json spaces', 2);

const intRegExp = /^\d+$/;
const creditCardNumberRegExp = /^\d{16}$/;

let films;
let genres;
const registrations = [];
const orders = [];

function getRegistration(req) {
  const authorization = req.headers.authorization;
  if (authorization) {
    const regex = /^Bearer (.*)$/;
    const m = authorization.match(regex);
    if (m) {
      const token = m[1];
      const registration = registrations.find(r => r.token == token);
      return registration;
    }
  }
}

function getOrder(token, filmId) {
  return orders.find(o => o.token === token && o.filmId === filmId);
}

function getOrderByTokenAndFilmId(token, filmId) {
  return orders.find(o => o.token === token && o.filmId === filmId);
}

function getOrderByTokenAndOrderId(token, orderId) {
  return orders.find(o => o.token === token && o.id === orderId);
}

function getFilm(filmId) {
  return films.find(f => f.id === filmId);
}

app.get("/orders", (req, res) => {
  const registration = getRegistration(req);
  if (!registration) {
    return res.status(401).json({ error: "You must provide a valid Bearer authentication token" });
  }
  const myOrders = orders.filter(o => o.token === registration.token);
  res.json(myOrders.map(o => {
    return {
      id: o.id,
      filmId: o.filmId,
      title: o.title,
      format: o.format
    };
  }))
});

app.get("/orders/:orderId", (req, res) => {
  const registration = getRegistration(req);
  if (!registration) {
    return res.status(401).json({ error: "You must provide a valid Bearer authentication token" });
  }
  const orderId = req.params.orderId;
  const order = getOrderByTokenAndOrderId(registration.token, orderId);
  if (!order) {
    return res.status(404).json({ error: `Order not found with ID ${orderId}` });
  }
  res.json({
      id: order.id,
      filmId: order.filmId,
      title: order.title,
      format: order.format
    });
});

app.post("/orders", (req, res) => {
  const registration = getRegistration(req);
  if (!registration) {
    return res.status(401).json({ error: "You must provide a valid Bearer authentication token" });
  }
  let filmId = req.body.filmId;
  if (!filmId) {
    return res.status(400).json({ error: "Request body must include filmId" });
  }
  if (!Number.isInteger(filmId)) {
    return res.status(400).json({ error: "filmId must be an integer" });
  }
  let format = req.body.format;
  if (!format) {
    return res.status(400).json({ error: "Request body must include format" });
  }
  const film = getFilm(filmId);
  if (!film) {
    return res.status(404).json({ error: `No film found with ID ${filmId}` });
  }
  if (getOrderByTokenAndFilmId(registration.token, filmId)) {
    return res.status(409).json({ error: "You already own this film" });
  }
  if (!film.formats.includes(format)) {
    return res.status(409).json({ error: `This film is not available in ${format} format` });
  }
  const order = {
    id: cryptoRandomString({ length: 32 }),
    token: registration.token,
    filmId: filmId,
    title: film.title,
    format: format
  };
  orders.push(order);
  res.status(201).json({
    id: order.id
  });
});

app.patch("/orders/:orderId", (req, res) => {
  const registration = getRegistration(req);
  if (!registration) {
    return res.status(401).json({ error: "You must provide a valid Bearer authentication token" });
  }
  const orderId = req.params.orderId;
  const order = getOrderByTokenAndOrderId(registration.token, orderId);
  if (!order) {
    return res.status(404).json({ error: `Order not found with ID ${orderId}` });
  }
  let format = req.body.format;
  if (!format) {
    return res.status(400).json({ error: "Request body must include format" });
  }
  const film = getFilm(order.filmId);
  if (!film.formats.includes(format)) {
    return res.status(409).json({ error: `This film is not available in ${format} format` });
  }
  order.format = format;
  res.status(204).end();
});

app.post("/registrations", (req, res) => {
  const name = req.body.name;
  const creditCardNumber = req.body.creditCardNumber;
  if (!name) {
    return res.status(400).json({ error: 'Body must include name' });
  }
  if (!creditCardNumber) {
    return res.status(400).json({ error: 'Body must include creditCardNumber' });
  }
  if (!creditCardNumberRegExp.test(creditCardNumber)) {
    return res.status(400).json({ error: 'Credit card number must be 16 digits' });
  }
  let existingRegistration = registrations.find(r => r.name.toLowerCase() === name.toLowerCase());
  if (existingRegistration) {
    return res.status(400).json({ error: 'Same name has already been registered' });
  }
  existingRegistration = registrations.find(r => r.creditCardNumber === creditCardNumber);
  if (existingRegistration) {
    return res.status(400).json({ error: 'Same credit card number has already been registered' });
  }
  const registration = {
    token: cryptoRandomString({length: 12, type: 'alphanumeric'}),
    name: name,
    creditCardNumber: creditCardNumber
  };
  registrations.push(registration);
  res.status(201).json({
    token: registration.token
  });
});

app.get("/", async (req, res) => {
  const md = await fs.promises.readFile("films-api.md", { encoding: 'utf-8' });
  const html = marked(md);
  res.contentType("text/html").send(html);
});

function getMyOrders(token) {
  return orders.filter(o => o.token === token);
}

app.get("/films", (req, res) => {
  let list = films.map((f) => {
    return {
      id: f.id,
      title: f.title,
      year: f.year,
      genres: f.genres
    };
  });
  const genre = req.query.genre;
  if (genre) {
    if (!genres.includes(genre)) {
      return res.status(400).json({ error: `genre must be one of: ${genres.join(', ')}` });
    }
    list = list.filter(f => f.genres.includes(genre));
  }
  let limit = req.query.limit;
  if (limit) {
    if (!intRegExp.test(limit)) {
      return res.status(400).json({ error: "limit must be an integer" });
    }
    limit = parseInt(limit);
    list = list.slice(0, limit);
  }
  const registration = getRegistration(req);
  if (registration) {
    list.forEach(film => {
      film.owned = getOrderByTokenAndFilmId(registration.token, film.id) != undefined;
    });
  }
  res.json(list);
});

app.get("/films/:filmId", (req, res) => {
  const idText = req.params.filmId;
  if (!intRegExp.test(idText)) {
    return res.status(400).json({ error: "filmId must be an integer" });
  }
  const id = parseInt(idText);
  const film = getFilm(id);
  if (!film) {
    res.status(404).json({ error: `No film found with ID ${id}` });
  }
  const registration = getRegistration(req);
  if (registration) {
    film.owned = getOrderByTokenAndFilmId(registration.token, film.id) != undefined;
  }
  res.json(film);
});

app.use((req, res) => {
  res.status(404).json({ error: `Cannot ${req.method} ${req.path}` });
});

function errorHandler (err, req, res, next) {
  if (res.headersSent) {
    return next(err)
  }
  res.status(err.status || 500);
  res.json({ error: err.message });
}

app.use(errorHandler);

async function loadFilms() {
  const data = await fs.promises.readFile("imdb-movie-data.csv");
  const filmsData = await csv(data);
  films = filmsData.map((row) => {
    return {
      id: parseInt(row.Rank),
      title: row.Title,
      description: row.Description,
      genres: row.Genre.split(",").map(s => s.trim().toLowerCase()),
      director: row.Director,
      actors: row.Actors.split(",").map(s => s.trim()),
      year: parseInt(row.Year),
      runtime: parseInt(row['Runtime (Minutes)']),
      formats: ["SD", "HD"]
    };
  });
  films.forEach(film => {
    if (film.id % 4 == 1) {
      film.formats = ["SD"]
    } else if (film.id % 4 == 2) {
      film.formats = ["HD"]
    } else if (film.id % 4 == 3) {
      film.formats = ["SD", "HD"]
    } else if (film.id % 4 == 0) {
      film.formats = ["SD", "HD", "4K"]
    }
  });
  genres = [...new Set(films.flatMap(f => f.genres))].map(g => g.toLowerCase()).sort();
}

async function startup() {
  await loadFilms();
  const port = process.env.PORT || 8000;
  app.listen(port, () => {
    console.log(`films-api listening on port ${port}...`);
  });
}

startup();