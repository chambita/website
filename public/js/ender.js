/*!
  * Ender.js: next-level JavaScript
  * copyright Dustin Diaz & Jacob Thornton 2011 (@ded @fat)
  * https://github.com/ded/Ender.js
  * License MIT
  */
!function (context) {

  function aug(o, o2) {
    for (var k in o2) {
      o[k] = o2[k];
    }
  }

  function _$(s, r) {
    this.elements = $._select(s, r);
    this.length = this.elements.length;
    for (var i = 0; i < this.length; i++) {
      this[i] = this.elements[i];
    }
  }

  function $(s, r) {
    return new _$(s, r);
  }

  aug($, {
    ender: function (o, proto) {
      aug(proto ? _$.prototype : $, o);
    },
    _select: function () {
      return [];
    }
  });

  var old = context.$;
  $.noConflict = function () {
    context.$ = old;
    return this;
  };

  (typeof module !== 'undefined') && module.exports ?
    (module.exports = $) :
    (context.$ = $);

}(this);/*!
  * bean.js - copyright @dedfat
  * https://github.com/fat/bean
  * Follow our software http://twitter.com/dedfat
  * MIT License
  * special thanks to:
  * dean edwards: http://dean.edwards.name/
  * dperini: https://github.com/dperini/nwevents
  * the entire mootools team: github.com/mootools/mootools-core
  */
!function (context) {
  var __uid = 1, registry = {}, collected = {},
      overOut = /over|out/,
      namespace = /[^\.]*(?=\..*)\.|.*/,
      stripName = /\..*/,
      addEvent = 'addEventListener',
      attachEvent = 'attachEvent',
      removeEvent = 'removeEventListener',
      detachEvent = 'detachEvent';

  function isDescendant(parent, child) {
    var node = child.parentNode;
    while (node != null) {
      if (node == parent) {
        return true;
      }
      node = node.parentNode;
    }
  }

  function retrieveEvents(element) {
    var uid = retrieveUid(element);
    return (registry[uid] = registry[uid] || {});
  }

  function retrieveUid(obj, uid) {
    return (obj.__uid = uid || obj.__uid || __uid++);
  }

  function listener(element, type, fn, add, custom) {
    if (element[addEvent]) {
      element[add ? addEvent : removeEvent](type, fn, false);
    } else if (element[attachEvent]) {
      custom && add && (element['_on' + custom] = element['_on' + custom] || 0);
      element[add ? attachEvent : detachEvent]('on' + type, fn);
    }
  }

  function nativeHandler(element, fn, args) {
    return function (event) {
      event = fixEvent(event || ((this.ownerDocument || this.document || this).parentWindow || context).event);
      return fn.apply(element, [event].concat(args));
    };
  }

  function customHandler(element, fn, type, condition, args) {
    return function (event) {
      if (condition ? condition.call(this, event) : event && event.propertyName == '_on' + type || !event) {
        fn.apply(element, [event].concat(args));
      }
    };
  }

  function addListener(element, orgType, fn, args) {
    var type = orgType.replace(stripName, ''), events = retrieveEvents(element),
        handlers = events[type] || (events[type] = {}),
        uid = retrieveUid(fn, orgType.replace(namespace, ''));
    if (handlers[uid]) {
      return element;
    }
    var custom = customEvents[type];
    fn = custom && custom.condition ? customHandler(element, fn, type, custom.condition) : fn;
    type = custom && custom.base || type;
    var isNative = context[addEvent] || nativeEvents.indexOf(type) > -1;
    fn = isNative ? nativeHandler(element, fn, args) : customHandler(element, fn, type, false, args);
    if (type == 'unload') {
      var org = fn;
      fn = function () {
        removeListener(element, type, fn) && org();
      };
    }
    listener(element, isNative ? type : 'propertychange', fn, true, !isNative && true);
    handlers[uid] = fn;
    fn.__uid = uid;
    return type == 'unload' ? element : (collected[retrieveUid(element)] = element);
  }

  function removeListener(element, orgType, handler) {
    var uid, names, uids, i, events = retrieveEvents(element), type = orgType.replace(stripName, '');
    if (!events || !events[type]) {
      return element;
    }
    names = orgType.replace(namespace, '');
    uids = names ? names.split('.') : [handler.__uid];
    for (i = uids.length; i--;) {
      uid = uids[i];
      handler = events[type][uid];
      delete events[type][uid];
      type = customEvents[type] ? customEvents[type].base : type;
      var isNative = element[addEvent] || nativeEvents.indexOf(type) > -1;
      listener(element, isNative ? type : 'propertychange', handler, false, !isNative && type);
    }
    return element;
  }

  function del(selector, fn, $) {
    return function (e) {
      var array = typeof selector == 'string' ? $(selector, this) : selector;
      for (var target = e.target; target && target != this; target = target.parentNode) {
        for (var i = array.length; i--;) {
          if (array[i] == target) {
            return fn.apply(target, arguments);
          }
        }
      }
    };
  }

  function add(element, events, fn, delfn, $) {
    if (typeof events == 'object' && !fn) {
      for (var type in events) {
        events.hasOwnProperty(type) && add(element, type, events[type]);
      }
    } else {
      var isDel = typeof fn == 'string', types = (isDel ? fn : events).split(' ');
      fn = isDel ? del(events, delfn, $) : fn;
      for (var i = types.length; i--;) {
        addListener(element, types[i], fn, Array.prototype.slice.call(arguments, isDel ? 4 : 3));
      }
    }
    return element;
  }

  function remove(element, orgEvents, fn) {
    var k, type, events,
        isString = typeof(orgEvents) == 'string',
        names = isString && orgEvents.replace(namespace, ''),
        rm = removeListener,
        attached = retrieveEvents(element);
    if (isString && /\s/.test(orgEvents)) {
      orgEvents = orgEvents.split(' ');
      var i = orgEvents.length - 1;
      while (remove(element, orgEvents[i]) && i--) {}
      return element;
    }
    events = isString ? orgEvents.replace(stripName, '') : orgEvents;
    if (!attached || (isString && !attached[events])) {
      return element;
    }
    if (typeof fn == 'function') {
      rm(element, events, fn);
    } else if (names) {
      rm(element, orgEvents);
    } else {
      rm = events ? rm : remove;
      type = isString && events;
      events = events ? (fn || attached[events] || events) : attached;
      for (k in events) {
        events.hasOwnProperty(k) && rm(element, type || k, events[k]);
      }
    }
    return element;
  }

  function fire(element, type) {
    var evt, k, i, types = type.split(' ');
    for (i = types.length; i--;) {
      type = types[i].replace(stripName, '');
      var isNative = nativeEvents.indexOf(type) > -1,
          isNamespace = types[i].replace(namespace, ''),
          handlers = retrieveEvents(element)[type];
      if (isNamespace) {
        isNamespace = isNamespace.split('.');
        for (k = isNamespace.length; k--;) {
          handlers[isNamespace[k]] && handlers[isNamespace[k]]();
        }
      } else if (element[addEvent]) {
        evt = document.createEvent(isNative ? "HTMLEvents" : "UIEvents");
        evt[isNative ? 'initEvent' : 'initUIEvent'](type, true, true, context, 1);
        element.dispatchEvent(evt);
      } else if (element[attachEvent]) {
        isNative ? element.fireEvent('on' + type, document.createEventObject()) : element['_on' + type]++;
      } else {
        for (k in handlers) {
          handlers.hasOwnProperty(k) && handlers[k]();
        }
      }
    }
    return element;
  }

  function clone(element, from, type) {
    var events = retrieveEvents(from), obj, k;
    obj = type ? events[type] : events;
    for (k in obj) {
      obj.hasOwnProperty(k) && (type ? add : clone)(element, type || from, type ? obj[k] : k);
    }
    return element;
  }

  function fixEvent(e) {
    if (!e) {
      return {};
    }
    var type = e.type, target = e.target || e.srcElement;
    e.preventDefault = e.preventDefault || fixEvent.preventDefault;
    e.stopPropagation = e.stopPropagation || fixEvent.stopPropagation;
    e.target = target && target.nodeType == 3 ? target.parentNode : target;
    if (type.indexOf('key') != -1) {
      e.keyCode = e.which || e.keyCode;
    } else if ((/click|mouse|menu/i).test(type)) {
      e.rightClick = e.which == 3 || e.button == 2;
      e.pos = { x: 0, y: 0 };
      if (e.pageX || e.pageY) {
        e.pos.x = e.pageX;
        e.pos.y = e.pageY;
      } else if (e.clientX || e.clientY) {
        e.pos.x = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
        e.pos.y = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
      }
      overOut.test(type) && (e.relatedTarget = e.relatedTarget || e[(type == 'mouseover' ? 'from' : 'to') + 'Element']);
    }
    return e;
  }
  fixEvent.preventDefault = function () {
    this.returnValue = false;
  };
  fixEvent.stopPropagation = function () {
    this.cancelBubble = true;
  };

  var nativeEvents = 'click,dblclick,mouseup,mousedown,contextmenu,' + //mouse buttons
    'mousewheel,DOMMouseScroll,' + //mouse wheel
    'mouseover,mouseout,mousemove,selectstart,selectend,' + //mouse movement
    'keydown,keypress,keyup,' + //keyboard
    'orientationchange,' + // mobile
    'touchstart,touchmove,touchend,touchcancel,' + // touch
    'gesturestart,gesturechange,gestureend,' + // gesture
    'focus,blur,change,reset,select,submit,' + //form elements
    'load,unload,beforeunload,resize,move,DOMContentLoaded,readystatechange,' + //window
    'error,abort,scroll'.split(','); //misc

  function check(event) {
    var related = event.relatedTarget;
    if (!related) {
      return related == null;
    }
    return (related != this && related.prefix != 'xul' && !/document/.test(this.toString()) && !isDescendant(this, related));
  }

  var customEvents = {
    mouseenter: { base: 'mouseover', condition: check },
    mouseleave: { base: 'mouseout', condition: check },
    mousewheel: { base: /Firefox/.test(navigator.userAgent) ? 'DOMMouseScroll' : 'mousewheel' }
  };

  var bean = { add: add, remove: remove, clone: clone, fire: fire };

  var clean = function (el) {
    var uid = remove(el).__uid;
    if (uid) {
      delete collected[uid];
      delete registry[uid];
    }
  };

  if (context[attachEvent]) {
    add(context, 'unload', function () {
      for (var k in collected) {
        collected.hasOwnProperty(k) && clean(collected[k]);
      }
      context.CollectGarbage && CollectGarbage();
    });
  }

  var oldBean = context.bean;
  bean.noConflict = function () {
    context.bean = oldBean;
    return this;
  };

  (typeof module !== 'undefined' && module.exports) ?
    (module.exports = bean) :
    (context.bean = bean);

}(this);/*!
  * qwery.js - copyright @dedfat
  * https://github.com/ded/qwery
  * Follow our software http://twitter.com/dedfat
  * MIT License
  */
!function (context, doc) {

  var c, i, j, k, l, m, o, p, r, v,
      el, node, len, found, classes, item, items, token, collection,
      id = /#([\w\-]+)/,
      clas = /\.[\w\-]+/g,
      idOnly = /^#([\w\-]+$)/,
      classOnly = /^\.([\w\-]+)$/,
      tagOnly = /^([\w\-]+)$/,
      tagAndOrClass = /^([\w]+)?\.([\w\-]+)$/,
      html = doc.documentElement,
      tokenizr = /\s(?![\s\w\-\/\?\&\=\:\.\(\)\!,@#%<>\{\}\$\*\^'"]*\])/,
      simple = /^([a-z0-9]+)?(?:([\.\#]+[\w\-\.#]+)?)/,
      attr = /\[([\w\-]+)(?:([\|\^\$\*\~]?\=)['"]?([ \w\-\/\?\&\=\:\.\(\)\!,@#%<>\{\}\$\*\^]+)["']?)?\]/,
      chunker = new RegExp(simple.source + '(' + attr.source + ')?');

  function array(ar) {
    r = [];
    for (i = 0, len = ar.length; i < len; i++) {
      r[i] = ar[i];
    }
    return r;
  }

  var cache = function () {
    this.c = {};
  };
  cache.prototype = {
    g: function (k) {
      return this.c[k] || undefined;
    },
    s: function (k, v) {
      this.c[k] = v;
      return v;
    }
  };

  var classCache = new cache(),
      cleanCache = new cache(),
      attrCache = new cache(),
      tokenCache = new cache();

  function q(query) {
    return query.match(chunker);
  }

  function interpret(whole, tag, idsAndClasses, wholeAttribute, attribute, qualifier, value) {
    var m, c, k;
    if (tag && this.tagName.toLowerCase() !== tag) {
      return false;
    }
    if (idsAndClasses && (m = idsAndClasses.match(id)) && m[1] !== this.id) {
      return false;
    }
    if (idsAndClasses && (classes = idsAndClasses.match(clas))) {
      for (i = classes.length; i--;) {
        c = classes[i].slice(1);
        if (!(classCache.g(c) || classCache.s(c, new RegExp('(^|\\s+)' + c + '(\\s+|$)'))).test(this.className)) {
          return false;
        }
      }
    }
    if (wholeAttribute && !value) {
      o = this.attributes;
      for (k in o) {
        if (Object.prototype.hasOwnProperty.call(o, k) && (o[k].name || k) == attribute) {
          return this;
        }
      }
    }
    if (wholeAttribute && !checkAttr(qualifier, this.getAttribute(attribute) || '', value)) {
      return false;
    }
    return this;
  }

  function loopAll(tokens) {
    var r = [], token = tokens.pop(), intr = q(token), tag = intr[1] || '*', i, l, els,
        root = tokens.length && (m = tokens[0].match(idOnly)) ? doc.getElementById(m[1]) : doc;
    if (!root) {
      return r;
    }
    els = root.getElementsByTagName(tag);
    for (i = 0, l = els.length; i < l; i++) {
      el = els[i];
      if (item = interpret.apply(el, intr)) {
        r.push(item);
      }
    }
    return r;
  }

  function clean(s) {
    return cleanCache.g(s) || cleanCache.s(s, s.replace(/([.*+?\^=!:${}()|\[\]\/\\])/g, '\\$1'));
  }

  function checkAttr(qualify, actual, val) {
    switch (qualify) {
    case '=':
      return actual == val;
    case '^=':
      return actual.match(attrCache.g('^=' + val) || attrCache.s('^=' + val, new RegExp('^' + clean(val))));
    case '$=':
      return actual.match(attrCache.g('$=' + val) || attrCache.s('$=' + val, new RegExp(clean(val) + '$')));
    case '*=':
      return actual.match(attrCache.g(val) || attrCache.s(val, new RegExp(clean(val))));
    case '~=':
      return actual.match(attrCache.g('~=' + val) || attrCache.s('~=' + val, new RegExp('(?:^|\\s+)' + clean(val) + '(?:\\s+|$)')));
    case '|=':
      return actual.match(attrCache.g('|=' + val) || attrCache.s('|=' + val, new RegExp('^' + clean(val) + '(-|$)')));
    }
    return false;
  }

  function _qwery(selector) {
    var r = [], ret = [], i, l,
        tokens = tokenCache.g(selector) || tokenCache.s(selector, selector.split(tokenizr));
    tokens = tokens.slice(0);
    if (!tokens.length) {
      return r;
    }
    r = loopAll(tokens);
    if (!tokens.length) {
      return r;
    }
    // loop through all descendent tokens
    for (j = 0, l = r.length, k = 0; j < l; j++) {
      node = r[j];
      p = node;
      // loop through each token
      for (i = tokens.length; i--;) {
        z: // loop through parent nodes
        while (p !== html && (p = p.parentNode)) {
          if (found = interpret.apply(p, q(tokens[i]))) {
            break z;
          }
        }
      }
      found && (ret[k++] = node);
    }
    return ret;
  }

  var isAncestor = 'compareDocumentPosition' in html ?
    function (element, container) {
      return (container.compareDocumentPosition(element) & 16) == 16;
    } : 'contains' in html ?
    function (element, container) {
      return container !== element && container.contains(element);
    } :
    function (element, container) {
      while (element = element.parentNode) {
        if (element === container) {
          return 1;
        }
      }
      return 0;
    };

  function boilerPlate(selector, root) {
    if (m = selector.match(idOnly)) {
      return (el = doc.getElementById(m[1])) ? [el] : [];
    }
    if (m = selector.match(tagOnly)) {
      return array(root.getElementsByTagName(m[1]));
    }
    return false;
  }

  function isNode(el) {
    return (el === window || el && el.nodeType && el.nodeType.toString().match(/[19]/));
  }

  function qsa(selector, _root) {
    var root = (typeof _root == 'string') ? qsa(_root)[0] : (_root || doc);
    if (isNode(selector)) {
      return !_root || isAncestor(selector, root) ? [selector] : [];
    }
    if (!root) {
      return [];
    }
    if (m = boilerPlate(selector, root)) {
      return m;
    }
    if (doc.getElementsByClassName && (m = selector.match(classOnly))) {
      return array((root).getElementsByClassName(m[1]));
    }
    return array((root).querySelectorAll(selector));
  }

  function uniq(ar) {
    var a = [], i, j;
    label:
    for (i = 0; i < ar.length; i++) {
      for (j = 0; j < a.length; j++) {
        if (a[j] == ar[i]) {
          continue label;
        }
      }
      a[a.length] = ar[i];
    }
    return a;
  }

  var qwery = function () {
    // return fast. boosh.
    if (doc.querySelector && doc.querySelectorAll) {
      return qsa;
    }
    return function (selector, _root) {
      var root = (typeof _root == 'string') ? qwery(_root)[0] : (_root || doc);
      if (isNode(selector)) {
        return !_root || isAncestor(selector, root) ? [selector] : [];
      }
      if (!root) {
        return [];
      }
      var i, l, result = [], collections = [], element;
      if (m = boilerPlate(selector, root)) {
        return m;
      }
      if (m = selector.match(tagAndOrClass)) {
        items = root.getElementsByTagName(m[1] || '*');
        r = classCache.g(m[2]) || classCache.s(m[2], new RegExp('(^|\\s+)' + m[2] + '(\\s+|$)'));
        for (i = 0, l = items.length, j = 0; i < l; i++) {
          r.test(items[i].className) && (result[j++] = items[i]);
        }
        return result;
      }
      for (i = 0, items = selector.split(','), l = items.length; i < l; i++) {
        collections[i] = _qwery(items[i]);
      }
      for (i = 0, l = collections.length; i < l && (collection = collections[i]); i++) {
        var ret = collection;
        if (root !== doc) {
          ret = [];
          for (j = 0, m = collection.length; j < m && (element = collection[j]); j++) {
            // make sure element is a descendent of root
            isAncestor(element, root) && ret.push(element);
          }
        }
        result = result.concat(ret);
      }
      return uniq(result);
    };
  }();

  // being nice
  var oldQwery = context.qwery;
  qwery.noConflict = function () {
    context.qwery = oldQwery;
    return this;
  };
  context.qwery = qwery;

}(this, document);
/*!
  * bonzo.js - copyright @dedfat 2011
  * https://github.com/ded/bonzo
  * Follow our software http://twitter.com/dedfat
  * MIT License
  */
!function (context) {

  var doc = document,
      html = (doc.compatMode == 'CSS1Compat') ?
        doc.documentElement :
        doc.body,
      specialAttributes = /^checked|value|selected$/,
      stateAttributes = /^checked|selected$/,
      ie = /msie/.test(navigator.userAgent);

  function classReg(c) {
    return new RegExp("(^|\\s+)" + c + "(\\s+|$)");
  }

  function each(ar, fn) {
    for (i = 0, len = ar.length; i < len; i++) {
      fn(ar[i]);
    }
  }

  function trim(s) {
    return s.replace(/(^\s*|\s*$)/g, '');
  }

  function camelize(s) {
    return s.replace(/-(.)/g, function (m, m1) {
      return m1.toUpperCase();
    });
  }

  function is(node) {
    return node && node.nodeName && node.nodeType == 1;
  }

  function some(ar, fn, scope) {
    for (var i = 0, j = ar.length; i < j; ++i) {
      if (fn.call(scope, ar[i], i, ar)) {
        return true;
      }
    }
    return false;
  }

  function _bonzo(elements) {
    this.elements = elements && Object.prototype.hasOwnProperty.call(elements, 'length') ? elements : [elements];
  }

  _bonzo.prototype = {

    each: function (fn) {
      for (var i = 0; i  < this.elements.length; i++) {
        fn.call(this, this.elements[i]);
      }
      return this;
    },

    map: function (fn) {
      var m = [];
      for (var i = 0; i  < this.elements.length; i++) {
        m.push(fn.call(this, this.elements[i]));
      }
      return m;
    },

    first: function () {
      return this.elements[0];
    },

    last: function () {
      return this.elements[this.elements.length - 1];
    },

    html: function (html) {
      return typeof html == 'string' ?
        this.each(function (el) {
          el.innerHTML = html;
        }) :
        this.elements[0].innerHTML;
    },

    addClass: function (c) {
      return this.each(function (el) {
        this.hasClass(el, c) || (el.className = trim(el.className + ' ' + c));
      });
    },

    removeClass: function (c) {
      return this.each(function (el) {
        this.hasClass(el, c) && (el.className = trim(el.className.replace(classReg(c), ' ')));
      });
    },

    hasClass: function (el, c) {
      return typeof c == 'undefined' ?
        some(this.elements, function (i) {
          return classReg(el).test(i.className);
        }) :
        classReg(c).test(el.className);
    },

    show: function (elements) {
      return this.each(function (el) {
        el.style.display = '';
      });
    },

    hide: function (elements) {
      return this.each(function (el) {
        el.style.display = 'none';
      });
    },

    create: function (node) {
      return typeof node == 'string' ?
        function () {
          var el = doc.createElement('div'), els = [];
          el.innerHTML = node;
          var nodes = el.childNodes;
          el = el.firstChild;
          els.push(el);
          while (el = el.nextSibling) {
            (el.nodeType == 1) && els.push(el);
          }
          return els;

        }() : is(node) ? [node.cloneNode(true)] : [];
    },

    append: function (node) {
      return this.each(function (el) {
        each(this.create(node), function (i) {
          el.appendChild(i);
        });
      });
    },

    prepend: function (node) {
      return this.each(function (el) {
        var first = el.firstChild;
        each(this.create(node), function (i) {
          el.insertBefore(i, first);
        });
      });
    },

    before: function (node) {
      return this.each(function (el) {
        each(this.create(node), function (i) {
          el.parentNode.insertBefore(i, el);
        });
      });
    },

    after: function (node) {
      return this.each(function (el) {
        each(this.create(node), function (i) {
          el.parentNode.insertBefore(i, el.nextSibling);
        });
      });
    },

    css: function (o, v) {
      var fn = typeof o == 'string' ?
        function (el) {
          el.style[camelize(o)] = v;
        } :
        function (el) {
          for (var k in o) {
            o.hasOwnProperty(k) && (el.style[camelize(k)] = o[k]);
          }
        };
      return this.each(fn);
    },

    offset: function () {
      var el = this.first();
      var width = el.offsetWidth;
      var height = el.offsetHeight;
      var top = el.offsetTop;
      var left = el.offsetLeft;
      while (el = el.offsetParent) {
        top = top + el.offsetTop;
        left = left + el.offsetLeft;
      }

      return {
        top: top,
        left: left,
        height: height,
        width: width
      };
    },

    attr: function (k, v) {
      var el = this.first();
      return typeof v == 'undefined' ?
        specialAttributes.test(k) ?
          stateAttributes.test(k) && typeof el[k] == 'string' ?
            true : el[k] : el.getAttribute(k) :
        this.each(function (el) {
          el.setAttribute(k, v);
        });
    },

    remove: function () {
      return this.each(function (el) {
        el.parentNode.removeChild(el);
      });
    },

    empty: function () {
      return this.each(function (el) {
        while (el.firstChild) {
          el.removeChild(el.firstChild);
        }
      });
    },

    detach: function () {
      return this.map(function (el) {
        return el.parentNode.removeChild(el);
      });
    },

    scrollTop: function (y) {
      return scroll.call(this, null, y, 'y');
    },

    scrollLeft: function (x) {
      return scroll.call(this, x, null, 'x');
    }

  };

  function scroll(x, y, type) {
    var el = this.first();
    if (x == null && y == null) {
      return (isBody(el) ? getWindowScroll() : { x: el.scrollLeft, y: el.scrollTop })[type];
    }
    if (isBody(el)) {
      window.scrollTo(x, y);
    } else {
      x != null && (el.scrollLeft = x);
      y != null && (el.scrollTop = y);
    }
    return this;
  }

  function isBody(element) {
    return element === window || (/^(?:body|html)$/i).test(element.tagName);
  }

  function getWindowScroll() {
    return { x: window.pageXOffset || html.scrollLeft, y: window.pageYOffset || html.scrollTop };
  }

  function bonzo(els) {
    return new _bonzo(els);
  }

  bonzo.aug = function (o, target) {
    for (var k in o) {
      o.hasOwnProperty(k) && ((target || _bonzo.prototype)[k] = o[k]);
    }
  };

  bonzo.doc = function () {
    var w = html.scrollWidth,
        h = html.scrollHeight,
        vp = this.viewport();
    return {
      width: Math.max(w, vp.width),
      height: Math.max(h, vp.height)
    };
  };

  bonzo.viewport = function () {
    var h = self.innerHeight,
        w = self.innerWidth;
    ie && (h = html.clientHeight) && (w = html.clientWidth);
    return {
      width: w,
      height: h
    };
  };

  bonzo.contains = 'compareDocumentPosition' in html ?
    function (container, element) {
      return (container.compareDocumentPosition(element) & 16) == 16;
    } : 'contains' in html ?
    function (container, element) {
      return container !== element && container.contains(element);
    } :
    function (container, element) {
      while (element = element.parentNode) {
        if (element === container) {
          return true;
        }
      }
      return false;
    };

  var old = context.bonzo;
  bonzo.noConflict = function () {
    context.bonzo = old;
    return this;
  };
  context.bonzo = bonzo;

}(this);!function () {
  var b = bean.noConflict(),
      integrate = function (method, type, method2) {
        var _args = type ? [type] : [];
        return function () {
          for (var i = 0, l = this.elements.length; i < l; i++) {
            var args = [this.elements[i]].concat(_args);
            b[method].apply(this, args.concat(Array.prototype.slice.call(arguments, 0)));
          }
          return this;
        };
      };

  var add = integrate('add'),
      remove = integrate('remove');

  var methods = {
    bind: add,
    listen: add,
    delegate: add,
    unbind: remove,
    unlisten: remove,
    undelegate: remove,
    trigger: integrate('fire'),
    cloneEvents: integrate('clone'),
    hover: function (enter, leave) {
      for (var i = 0, l = this.elements.length; i < l; i++) {
        b.add.call(this, this.elements[i], 'mouseenter', enter);
        b.add.call(this, this.elements[i], 'mouseleave', leave);
      }
      return this;
    }
  };

  var shortcuts = [
    'blur', 'change', 'click', 'dbltclick', 'error', 'focus', 'focusin',
    'focusout', 'keydown', 'keypress', 'keyup', 'load', 'mousedown',
    'mouseenter', 'mouseleave', 'mouseout', 'mouseover', 'mouseup',
    'resize', 'scroll', 'select', 'submit', 'unload'
  ];

  for (var i = shortcuts.length; i--;) {
    var shortcut = shortcuts[i];
    methods[shortcut] = integrate('add', shortcut);
  }

  $.ender(methods, true);
}();$._select = qwery.noConflict();$.ender(bonzo);
$.ender(bonzo(), true);
bonzo.noConflict();