---
layout: docs
title: API providers
weight: 4
---

### REST

In almost every case you want to expose your services through a RESTful JSON interface. This can be achieved by calling `app.configure(feathers.rest())`. Note that you will have to provide your own body parser middleware like the standard [Express 4 body-parser](https://github.com/expressjs/body-parser) to make REST `.create`, `.update` and `.patch` calls pass the parsed data.

To set service parameters in a middleware, just attach it to the `req.feathers` object which will become the params for any service call. It is also possible to use URL parameters for REST API calls which will also be added to the params object:

```js
var bodyParser = require('body-parser');

app.configure(feathers.rest())
  .use(bodyParser.json())
  .use(bodyParser.urlencoded({extended: true}))
  .use(function(req, res, next) {
    req.feathers.data = 'Hello world';
    next();
  });

app.use('/:app/todos', {
  get: function(name, params, callback) {
    console.log(params.data); // -> 'Hello world'
    console.log(params.app); // will be `my` for GET /my/todos/dishes
    callback(null, {
      id: name,
      params: params,
      description: "You have to do " + name + "!"
    });
  }
});
```

The default REST handler is a middleware that formats the data retrieved by the service as JSON. If you would like to configure your own `handler` middleware just pass it to `feathers.rest(handler)`. For example, a middleware that just renders plain text with the todo description (`res.data` contains the data returned by the service):

```js
app.configure(feathers.rest(function restFormatter(req, res) {
    res.format({
      'text/plain': function() {
        res.end('The todo is: ' + res.data.description);
      }
    });
  }))
  .use('/todo', {
    get: function (id, params, callback) {
      callback(null, { description: 'You have to do ' + id });
    }
  });
```

If you want to add other middleware *before* the REST handler, simply call `app.use(middleware)` before configuring the handler.

### SocketIO

To expose services via [SocketIO](http://socket.io/) call `app.configure(feathers.socketio())`. It is also possible pass a `function(io) {}` when initializing the provider where `io` is the main SocketIO object. Since Feathers is only using the SocketIO default configuration, this is a good spot to initialize the [recommended production settings](https://github.com/LearnBoost/Socket.IO/wiki/Configuring-Socket.IO#recommended-production-settings):

```js
app.configure(feathers.socketio(function(io) {
  io.enable('browser client minification');  // send minified client
  io.enable('browser client etag');          // apply etag caching logic based on version number
  io.enable('browser client gzip');          // gzip the file

  // enable all transports (optional if you want flashsocket support, please note that some hosting
  // providers do not allow you to create servers that listen on a port different than 80 or their
  // default port)
  io.set('transports', [
      'websocket'
    , 'flashsocket'
    , 'htmlfile'
    , 'xhr-polling'
    , 'jsonp-polling'
  ]);
}));
```

> Note: io.set is deprecated in Socket.IO 1.0. The above configuration will still work but will be replaced with the recommended production configuration for version 1.0 (which isn't available at the moment).

This is also the place to listen to custom events or add [authorization](https://github.com/LearnBoost/socket.io/wiki/Authorizing):

```js
app.configure(feathers.socketio(function(io) {
  io.on('connection', function(socket) {
    socket.emit('news', { hello: 'world' });
    socket.on('my other event', function (data) {
      console.log(data);
    });
  });

  io.use(function (socket, next) {
    // Authorize using the /users service
    app.service('users').find({
      username: socket.request.username,
      password: socket.request.password
    }, next);
  });
}));
```

Similar than the REST middleware, the SocketIO socket `feathers` property will be extended
for service parameters:

```js
app.configure(feathers.socketio(function(io) {
  io.use(function (socket, next) {
    socket.feathers.user = { name: 'David' };
    next();
  });
}));

app.use('todos', {
  create: function(data, params, callback) {
    // When called via SocketIO:
    params.user // -> { name: 'David' }
  }
});
```

Once the server has been started with `app.listen()` the SocketIO object is available as `app.io`.

### Primus

[Primus](https://github.com/primus/primus) is a universal wrapper for real-time frameworks and allows you to transparently use Engine.IO, WebSockets, BrowserChannel, SockJS and Socket.IO. Set it up with `feathers.primus(configuration [, fn])` where `configuration` is the [Primus server configuration](https://github.com/primus/primus#getting-started) and `fn` an optional callback with the Primus server instance that can e.g. be used for setting up [authorization](https://github.com/primus/primus#authorization):

```js
// Set up Primus with SockJS
app.configure(feathers.primus({
  transformer: 'sockjs'
}, function(primus) {
  // Set up Primus authorization here
  primus.authorize(function (req, done) {
    var auth;

    try { auth = authParser(req.headers['authorization']) }
    catch (ex) { return done(ex) }

    // Do some async auth check
    authCheck(auth, done);
  });
}));
```

In the Browser you can connect like this:

```html
<script type="text/javascript" src="primus/primus.js"></script>
<script type="text/javascript">
  var primus = new Primus(url);

  primus.on('todos created', function(todo) {
    console.log('Someone created a Todo', todo);
  });

  primus.send('todos::create', { description: 'Do something' }, {}, function() {
    primus.send('todos::find', {}, function(error, todos) {
      console.log(todos);
    });
  });
</script>
```

Just like REST and SocketIO, the Primus request object can be extended with a `feathers` parameter during authorization which will extend the `params` for any service request:

```js
app.configure(feathers.primus({
  transformer: 'sockjs'
}, function(primus) {
  // Set up Primus authorization here
  primus.authorize(function (req, done) {
    req.feathers = {
      user: { name: 'David' }
    }

    done();
  });
}));
```
