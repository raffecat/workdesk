MiniDOM = (function(){

  // assumptions:
  // fields will not be deleted from models.
  // models will be modified in-place, then a sub-tree synced.
  // GC fix: clear elem.miniDom on removeChild, set on insertBefore.

  var nextId = 1;

  function syncAttrs(node, model, state) {
    // bring DOM attributes in sync with the model.
    for (var name in model) {
      var to = model[name]; if (to === void 0) to = null;
      var old = state[name]; if (old === void 0) old = null;
      if (old !== to) {
        state[name] = to;
        if (to != null) {
          node.setAttribute(name, to);
        } else {
          node.removeAttribute(name);
        }
      }
    }
  }

  function syncProps(node, model, state) {
    // bring DOM properties in sync with the model.
    for (var name in model) {
      var to = model[name]; if (to === void 0) to = null;
      var old = state[name]; if (old === void 0) old = null;
      if (old !== to) {
        state[name] = to;
        node[name] = to;
      }
    }
  }

  function syncClasses(elem, model, state) {
    // bring DOM classList in sync with the model.
    // TODO: use classList and do it properly.
    var to = model.join(" ");
    if (to !== state.classes) {
      state.classes = to;
      elem.className = to;
    }
  }

  function syncGroup(parent, nextChild, children, enclosing) {
    // bring DOM child nodes in sync with the model.
    for (var i=0, n=children.length; i<n; i++) {
      var model = children[i];
      // var id = model.id || (model.id = (id = 'md-'+(nextId++)));
      if (typeof model === 'string') {
        // text node.
        if (nextChild && nextChild.nodeType === 3) { // is Text.
          if (nextChild.nodeValue !== model) {
            nextChild.nodeValue = model;
          }
          nextChild = nextChild.nextSibling; // advance past this node.
        } else {
          elem = document.createTextNode(model);
          parent.insertBefore(elem, nextChild);
        }
      } else if (model instanceof Array) {
        // group of child nodes (easy to toggle/replace)
        nextChild = syncGroup(parent, nextChild, model, enclosing);
      } else if (model) { // allow null for toggling nodes.
        // element node.
        var state = model['@dom'] || (model['@dom'] = (state = {}));
        var elem = state.domNode;
        if (!elem) {
          state.domNode = (elem = document.createElement(model.tag));
          if (model.id) elem.id = model.id;
          elem.miniDom = model; // for events.
        }
        syncElem(elem, model, state);
        if (nextChild === elem) {
          nextChild = nextChild.nextSibling; // advance past this node.
        } else {
          parent.insertBefore(elem, nextChild);
        }
        model.parent = enclosing; // for events.
      }
    }
    return nextChild;
  }

  function syncChildren(parent, children, enclosing) {
    // bring DOM child nodes in sync with the model.
    // this can involve creating and moving DOM nodes.
    var nextChild = syncGroup(parent, parent.firstChild, children, enclosing);
    // remove any left-over child nodes from the DOM.
    // they might have moved elsewhere in the model tree,
    // or they might no longer exist in the model.
    while (nextChild) {
      parent.removeChild(nextChild);
      nextChild = nextChild.nextSibling;
    }
  }

  function syncElem(elem, model, state) {
    // update element attributes, styles, classes and child nodes.
    if (model.attrs) {
      if (!state.attrs) state.attrs = {};
      syncAttrs(elem, model.attrs, state.attrs);
    }
    if (model.style) {
      if (!state.style) state.style = {};
      syncProps(elem.style, model.style, state.style);
    }
    if (model.classes) {
      syncClasses(elem, model.classes, state);
    }
    // recursively process child elements.
    if (model.children) {
      syncChildren(elem, model.children, model);
    }
  }

  return { sync: syncElem };

})();
