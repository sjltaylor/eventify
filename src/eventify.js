function eventify(source) {

    var namespace, configure;

    if (arguments.length === 3) {
      namespace = arguments[1];
      configure = arguments[2];
    } else {
      configure = arguments[1];
    }

    if (namespace) {
      if ('eventifyNamespace' in source) {
        throw new Error('object already has a namespace: ' + namespace)
      }
      source.eventifyNamespace = namespace;
    }

   function installEvent (options) {

      var _event = new eventify.Event(options);

      if (options.eventName in source) {
        throw new Error('"'+ options.eventName +'" is already defined');
      }

      // assign the event listener registration function to the specified name
      source[options.eventName] = function(listener) {

        if (typeof listener === 'function') {
          return _event._listen({
            listener: listener
          });
        }

        return _event;
      };

      source[options.eventName]._returnsAnEventifyEvent = true;

      if (_event.isOneTimeEvent()) {
        eventify._oneTimeEvents[_event.fullName()] = { hasOccurred: false };
      }
   }

   var configurationApi = {

     define: function (eventName, options) {
       options = options || {};

       options.source    = source;
       options.eventName = eventName;

       installEvent(options);

       return this;
     }
   , pipe: function (functionOrEvent) {
      
      var evt = functionOrEvent._returnsAnEventifyEvent ? functionOrEvent() : functionOrEvent;
      
      var subs = evt._listen({
        listener: function () {
          var propagation = source[evt.name()]();
          propagation.emit.apply(propagation, arguments);
        }
      });

      var sourceMember = source[evt.name()];

      if (!(typeof sourceMember === 'function' && sourceMember._returnsAnEventifyEvent)) {
        this.define(evt.name());
      }
     }
   };

  if (typeof configure !== 'undefined') { 
    // assume it is a function
    configure.call(configurationApi, configurationApi);
  }

  return source;
}

eventify.cancelAllSubscriptionsOn = function (object) {

  for (var member in object) {
    if (object[member] && object[member]._returnsAnEventifyEvent) {
      object[member]().subscriptions().cancelAll();
    }
  }

  return object;
}