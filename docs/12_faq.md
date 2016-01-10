---
title: FAQ
layout: docs
permalink: /docs/faq/
---

## Nested routes

Feathers does not provide an ORM so it does not know about associations between your services. Generally services are connected by their resource ids so any nested route can be expressed by query paramters. For example if you have a user service and would like to get all todos (assuming the associated user id is stored in each todo) for that user the url would be `/todos?userId=<userid>`.

You can however add Express style parameters to your routes when you register a service which will then be set in the `params` object in each service call. For example a `/users/:userId/todos` route can be provided like this:

```js
app.use('/users/:userId/todos', {
  find: function(params, calllback) {
    // params.userId == current user id
  },
  create: function(data, params, callback) {
    data.userId = params.userId;
    // store the data
  }
})
```

__Note:__ This route has to be registered _before_ the `/users` service otherwise the `get` route from the user service at `/users` will be matched first.

## Get websocket events from REST calls

Every service emits all events no matter from where it has been called. So even creating a new  Todo internally on the server will send the event out on every socket that should receive it. This is very similar to what [Firebase](http://firebase.io/) does (but for free and open source). For a more detailed comparison and migration guide read [Feathers as an open source alternative to Firebase](https://medium.com/all-about-feathersjs/using-feathersjs-as-an-open-source-alternative-to-firebase-b5d93c200cee).

You can also listen to events on the server by retrieving the wrapped service object which is an event emitter:

```js
// Retrieve the registered Todo service
var todoService = app.service('todos');
var todoCount = 0;

todoService.on('created', function(todo) {
  // Increment the total number of created todos
  todoCount++;
});
```

## Find where a method call came from

Sometimes you want to allow certain service calls internally (like creating a new user) but not through the REST or websocket API. This can be done by adding the information in a middleware to the `request.feathers` object which will be merged into service call parameters:

```js
app.use(function(req, res, next) {
  req.feathers.external = 'rest';
  next();
});

app.configure(feathers.socketio(function(io) {
  io.use(function(socket, next) {
    // For websockets the feathers object does not exist by default
    if(!socket.feathers) {
      socket.feathers = {};
    }

    socket.feathers.external = 'socketio';
    next();
  });
}));


app.use('/todos', {
  get: function(id, params, callback) {
    if(!params.external) {
      return callback(null, {
        id: id,
        text: 'Do ' + id + '!'
      });
    }
    callback(new Error('External access not allowed'));
  }
});

var todoService = app.service('todos');
// Call .get without the external parameter set to get the result
todoService.get('laundry', {}, function(error, todo) {
  todo.text // -> 'Do laundry!'
});
```

## Add authentication

Generally any authentication mechanism used for Express can also be implemented in Feathers.

Please refer to the [authentication](/learn/authentication/) and [authorization](/learn/authorization) section of the guide and, in more detail, the [feathers-hooks](https://github.com/feathersjs/feathers-hooks) and [feahters-passport](https://github.com/feathersjs/feathers-passport) modules for more information.

## Only send certain events

In almost any larger application not every user is supposed to receive every event through websockets. The [event filtering section](/api/#event-filtering) in the API documentation contains detailed documentation on how to only send events to authorized users.

The following example only dispatches the Todo `updated` event if the authorized user belongs to the same company:

```js
app.configure(feathers.socketio(function(io) {
  io.use(function (socket, callback) {
    // Authorize using the /users service
    app.lookup('users').find({
      username: handshake.username,
      password: handshake.password
    }, function(error, user) {
      if(!error || !user) {
        return callback(error, false);
      }

      socket.feathers = {
        user: user
      };

      callback(null, true);
    });
  });
}));

app.use('todos', {
  update: function(id, data, params, callback) {
    // Update
    callback(null, data);
  },

  updated: function(todo, params, callback) {
    // params === handshake.feathers
    if(todo.companyId === params.user.companyId) {
      // Dispatch the todo data to this client
      return callback(null, todo);
    }

    // Call back with a falsy value to prevent dispatching
    callback(null, false);
  }
});
```

## Custom service middleware

Custom Express middleware that only should be run before a specific service can simply be passed to `app.use` before the service object:

```js
app.use('/todos', ensureAuthenticated, logRequest, todoService);
```

Keep in mind that shared authentication (between REST and websockets) should use a service based approach as described in the [authentication section of the guide](/learn/authentication).

## Another Node web framework

We know! Oh God another NodeJS framework! We really didn't want to add another name to the long list of NodeJS web frameworks but also wanted to explore a different approach than any other library we have seen. We strongly believe that data is the core of the web and should be the focus of web applications.

Many web frameworks focus on things like rendering views, defining routes and handling HTTP requests and responses without providing a structure for implementing application logic separate from those secondary concerns. The result - even when using the MVC pattern - are big monolithic controllers where your actual application logic and how it is accessed - usually via HTTP - are all mixed up together.

Feathers services bring two important concepts together that help to separate those concerns from how your application works:

1) A __[service layer](http://martinfowler.com/eaaCatalog/serviceLayer.html)__ which helps to decouple your application logic from how it is being accessed and represented. Besides also making things a lot easier to test - you just call your service methods instead of having to make fake HTTP requests - this is what allows Feathers to provide the same API through both HTTP REST and websockets. It can even be extended to use any other RPC protocol and you won't have to change any of your services.

2) A __[uniform interface](http://en.wikipedia.org/wiki/Representational_state_transfer#Uniform_interface)__ which is one of the key constraints of [REST](http://en.wikipedia.org/wiki/Representational_state_transfer) in which context it is commonly referred to as the different HTTP verbs (GET, POST, PUT, PATCH and DELETE). This translates almost naturally into the Feathers service object interface:

```js
var myService = {
  // GET /path
  find: function(params, callback) {},
  // GET /path/<id>
  get: function(id, params, callback) {},
  // POST /path
  create: function(data, params, callback) {},
  // POST /path/<id>
  update: function(id, data, params, callback) {},
  // PATCH /path/<id>
  patch: function(id, data, params, callback) {},
  // DELETE /patch/<id>
  remove: function(id, params, callback) {}
}
```

This interface also makes it easier to hook into the execution of those methods and emit events when they return which can naturally be used to provide real-time functionality.

## What about Koa?

Koa is a *"next generation web framework for Node.JS"* using ES6 generator functions instead of Express middleware. This approach does unfortunately not easily play well with Feathers services so there are no direct plans yet to use it as a future base for Feathers.

There are however definite plans of using ES6 features for Feathers once they make it into `node --harmony`, specifically:

- [Promises](http://www.html5rocks.com/en/tutorials/es6/promises/) instead of callbacks for asynchronous processing
- [ES6 classes](http://wiki.ecmascript.org/doku.php?id=strawman:maximally_minimal_classes) for defining services.

And a lot of the other syntactic sugar that comes with ES6 like arrow functions etc. If you want to join the discussion, chime in on [Feathers issue #83](https://github.com/feathersjs/feathers/issues/83)
