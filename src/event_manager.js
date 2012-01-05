eventSource.EventManager = (function () {

  function callEventListeners (emitTime, args) {
    var self = this;
    self._lastEmitTime = emitTime;

    // if there is a time set, clear it
    if (self._intervalTimeoutId) {
      clearTimeout(this._intervalTimeoutId);
      delete this._intervalTimeoutId;
    }

    for (var i = 0; i < self._listeners.length; ) {
      var listener = self._listeners[i];
      if (listener.__onceListener) {
        self._listeners.splice(i, 1);
      } else {
        i++;
      }
      listener.apply(self.source, args);
    }

    if (self._oneTimeEvent) self.unbindAll();
  }

  function EventManager (source, eventName) {
    this.source     = source;
    this.eventName  = eventName;
    this._listeners = [];
  };

  EventManager.prototype = {
    bind: function (listener) {
      var self = this;

      if (typeof listener === 'function') {
        if (self._oneTimeEvent && self._oneTimeEventPassed) {
          // call back on the next tick
          setTimeout(function () {
            listener.apply(self.source, self._oneTimeEventEmitArgs);
          }, 0);
        }
        self._listeners.push(listener);
      }

      return new eventSource.EventSubscription(this, listener);
    }
  , unbind: function (listenerToRemove) {
      this._listeners = this._listeners.filter(function(registeredListener){
        return registeredListener != listenerToRemove;
      });

      return this.source;
    }
  , unbindAll: function (listenerToRemove) {
      this._listeners = [];
      return this.source;
    }
  , emit: function () {

      var emitTime  = new Date().getTime()
        , source    = this.source
        , self      = this
        , throttled = !!this._emitInterval;

      if (self._oneTimeEvent) {
        if (self._oneTimeEventPassed) {
          return false;
        } else {
          self._oneTimeEventEmitArgs = arguments;
          self._oneTimeEventPassed = true;
        }
      }

      if (throttled) {

        var lastEmitTime        = self._lastEmitTime || 0
          , minimumEmitInterval = self._emitInterval
          , intervalElapsed     = lastEmitTime < (emitTime - minimumEmitInterval);

        if (!intervalElapsed) {

          // throttle the emission, set a timer which when triggered emits with the most recent arguments

          // stash the most recent arguments for when the interval elapses
          self._stashedEmitArgs = arguments;

          if (!self._intervalTimeoutId) {
            self._intervalTimeoutId = setTimeout(function () {
              callEventListeners.call(self, emitTime, self._stashedEmitArgs);
              delete self._stashedEmitArgs;
            }, minimumEmitInterval);
          }

          return false;
        }
      }

      callEventListeners.call(self, emitTime, arguments);

      return true;
    }
  , emitInterval: function (minimumInterval) {

      if (minimumInterval === null) {
        delete this._emitInterval;
      } else if (typeof minimumInterval !== 'number') {
        return this._emitInterval;
      } else {
        minimumInterval = (typeof minimumInterval === 'number') ? minimumInterval : 10;
        minimumInterval = Math.max(minimumInterval, 1);

        this._emitInterval = minimumInterval;
      }

      return this.source;
    }
  , listeners: function () {
      return this._listeners;
    }
  , once: function (listener) {
      listener.__onceListener = true;
      return this.bind(listener);
    }
  , oneTimeEvent: function () {
      this._oneTimeEvent          = true;
      this._oneTimeEventPassed = false;
      return this.source;
    }
  };

  return EventManager;
})()