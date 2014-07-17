#Handlers

Handlers are similar to a controller in that they handle a final action. Essentially they return a response.

An example of a handler would be the default error handler. This handler has errors handed off to it from Stukko.

In the event the handler doesn't exist or there is some error, Stukko will take the default action internally. 

Handlers make it possible then to maintain a consistent stack but give the application control over these actions so as to customize the response when needed.





