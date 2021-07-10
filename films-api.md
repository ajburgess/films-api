# Films API

## Get all films

```GET /films```

Returns list of all films.

Optional parameter: ```genre```

Only select films with specific genre.
Must be one of: ```action, adventure, animation, biography, comedy, crime, drama, family, fantasy, history, horror, music, musical, mystery, romance, sci-fi, sport, thriller, war, western```

Optional parameter: ```limit```

Return at most this many results.

*Note that if an authorisation token is supplied (in headers) then each film returned will also include a property ```owned``` (which will be ```true``` if you own the title, and ```false``` if you don't).*

## Get specific film

```GET /films/:filmId```

Returns full details for the film with the given ID.

*Note that if an authorisation token is supplied (in headers) then the film returned will also include a property ```owned``` (which will be ```true``` if you own the title, and ```false``` if you don't).*

## Regsiter as a new customer

```POST /registrations```

Request body must include the following mandatory properties:

```name``` - name of the customer

```creditCardNumber``` - credit card number of the customer (16 digits)

For example:

```
{
    "name": "Fred Smith",
    "creditCardNumber": "1111222233334444"
}
```

If request is successful, the returned response will include the following properties:

```token``` - authorisation token to identify the user later in other requests

## Order a film

Place an order for a film.

```POST /orders```

When making this request, you must supply a Bearer authentication token to identify yourself (see above).

The request body must include the following information:

```filmId``` - which film you are purchasing

```format``` - which format you want to watch the film in (e.g. SD or HD)

For example:

```
{
  "filmId": 123,
  "format": "SD"
}
```

The returned response will contain the following property:

```id``` - the ID of the order created

## Get my orders

```GET /orders```

Returns a list of all the orders you have placed in the past.

When making this request, you must supply a Bearer authentication token to identify yourself (see above).

## Get specific order

```GET /orders/:orderId```

Get the details of a specific one of your orders.

## Update an order

```PATCH /orders/:orderId```

Change the format of an existing film order.

When making this request, you must supply a Bearer authentication token to identify yourself (see above).

The request body must include the following information:

```format``` - which format you want to watch the film in (e.g. SD or HD)

For example:

```
{
  "format": "HD"
}
```
