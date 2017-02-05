Workdesk = (function(){
    var dom_sync = MiniDOM.sync; // window.

    var desk = {};
    desk.reg = register;
    desk.panel = newPanel;
    desk.add = addPanel;
    desk.uid = uniqueId;
    desk.later = later;

    function remove(seq,item){
      for (var i=0,n=seq.length;i<n;i++) {
        if (seq[i] === item) {
          seq.splice(i,1);
          return;
        }
      }
    }

    var queue = [];
    function later(fn) { queue.push(fn) }
    function run() { for (var q=queue, i=0; i<q.length; i++) q[i](); q.length=0; }

    var frames = [];
    var root = { tag:'body', children:frames };
    var state = {};

    desk.root = root;

    function sync() {
      dom_sync(document.body, root, state);
      run();      
    }

    var types = {};
    function register(name, fn) {
      types[name] = fn;
    }

    var nextId = 1;
    function uniqueId() { return 'id'+(nextId++); }

    var nextPos = 10;
    function addPanel(panel, x, y, w, h) {
        if (x==null || y==null) {
          x = nextPos; y = nextPos;
          nextPos += 50; if (nextPos > 1000) nextPos = 10;
        }
        if (w == null || w < 400) w = 400;
        if (h == null || h < 300) h = 300;
        if (!panel.style) panel.style = {};
        panel.style.left = x+'px';
        panel.style.top = y+'px';
        panel.style.width = w+'px';
        panel.style.height = h+'px';
        frames.push(panel);
    }

    function getMousePos(e, pos) {
        // clientXY is only for IE (documentElement in 6+ standards mode)
        pos.x = e.pageX || (e.clientX + document.documentElement.scrollLeft);
        pos.y = e.pageY || (e.clientY + document.documentElement.scrollTop);
    }
    function getElemPos(elem, pos) {
        // get element position in document coords.
        var x=0, y=0; do {
          x += elem.offsetLeft; y += elem.offsetTop;
        } while (elem=elem.offsetParent);
        pos.x = x; pos.y = y;
    }

    function bringToFront(elem) {
        // bring the panel to the front.
        var maxZ = 0;
        for (var n=document.body.firstChild; n; n=n.nextSibling) {
            var s = n.style, z = s && +s.zIndex;
            if (z > maxZ) maxZ = z;
        }
        elem.style.zIndex = maxZ + 1;
    }

    function startDrag(e, elem) {
        e = e || event;
        var mpos = {}; getMousePos(e, mpos);
        var epos = {}; getElemPos(elem, epos);
        var orgX = mpos.x - epos.x;
        var orgY = mpos.y - epos.y;
        document.body.onmouseup = function() {
            // FIXME: use capture so we can't miss mouseup.
            document.body.onmouseup = null;
            document.body.onmousemove = null;
        };
        document.body.onmousemove = function(e) {
            e = e || event;
            getMousePos(e, mpos);
            elem.miniDom.style.left = (mpos.x - orgX)+'px';
            elem.miniDom.style.top = (mpos.y - orgY)+'px';
            elem.style.left = (mpos.x - orgX)+'px';
            elem.style.top = (mpos.y - orgY)+'px';
        };
        bringToFront(elem);
    }

    document.body.onmousedown = function(e) {
        e = e || event;
        var elem = e.target || e.srcElement;
        var body = document.body;
        // find a parent with an id (a panel or something else)
        while (elem && elem !== body && !(elem.miniDom && (elem.miniDom.canDrag || elem.miniDom.noDrag))) elem = elem.parentNode;
        // only drag children of the body.
        if (elem && elem.miniDom && elem.miniDom.canDrag) {
            e.preventDefault();
            startDrag(e, elem);
        }
    };

    document.body.onclick = function(e) {
        e = e || event;
        var elem = e.target || e.srcElement;
        var body = document.body;
        while (elem && elem !== body) {
          var model = elem.miniDom;
          // stop at the first clickable node.
          if (model && model.onclick) {
            model.onclick(model, e);
            sync();
            break;
          }
          elem = elem.parentNode;
        }
        sync();
    };

    var ws = /\s+/;

    function closePanel(panel) {
      remove(frames, panel.parent);
    }

    function newPanel(content, cls, title) {
      var classes = cls.split(ws); classes.unshift('panel');
      return { tag:'div', classes:classes, canDrag:true, children:[
        { tag:'div', classes:['panel-bg'] },
        { tag:'div', classes:['title-icon','icon-power-cord','enabled'] },
        { tag:'div', classes:['title'], children:[title] },
        { tag:'div', classes:['title-close icon-cancel'], onclick:closePanel, noDrag:true },
        { tag:'div', classes:['panel-content'], children:[content], noDrag:true }
      ]};
    }

    function newPane(content, cls) {
      var classes = cls.split(ws); classes.unshift('panel');
      return { tag:'div', classes:classes, children:[
        { tag:'div', classes:['panel-bg'] },
        { tag:'div', classes:['panel-content'], children:[content] }
      ]};
    }

    var connectBtn = newPane({ tag:'span', classes:["icon-power-cord"] }, 'connectBtn');
    frames.push(connectBtn);
    connectBtn.onclick = function(e) {
      load([
        { is:'mapping', name:'not connected', items:['not sure what I should be doing o.O'] }
      ]);
    };

    var newBtn = newPane({ tag:'span', classes:["icon-plus"] }, 'newBtn');
    frames.push(newBtn);
    newBtn.onclick = function(e) {
      load([
        { is:'editor', name:'untitled', text:'' }
      ]);
    };

    function setGridSize(size) {
        var c = document.createElement("canvas");
        c.height = c.width = size;
        var ctx = c.getContext('2d');
        ctx.strokeStyle = '#555';
        ctx.beginPath();
        ctx.moveTo(0,0);
        ctx.lineTo(0,size);
        ctx.closePath();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0,0);
        ctx.lineTo(size,0);
        ctx.closePath();
        ctx.stroke();
        document.body.style['background-image'] = "url(" + c.toDataURL("image/png")+ ")";
    }

    setGridSize(25);
    var data = [
      { "is":"mapping", "name":"localhost:8000", "items":[
        "/api/communities",
        "/api/communities/:page",
        "/api/communities/:page/membership",
        "/api/communities/:page/members",
        "/api/communities/:page/forum/:topic",
        "/api/communities/:page/wiki/:topic",
        "/api/communities/:page/wiki/:topic/edit",
        "/api/communities/:page/edit",
        "/api/communities/:page/new",
        "/api/communities/new",
        "/api/forum/:forum/posts",
        "/api/forum/:forum/newpost",
        "/api/forum/:forum/:post/edit",
        "/api/forum/:forum/:post/delete"
      ]},
      { "is":"editor", "name":"/api/forum/:forum/posts", "text":"function(){}" }
    ];

    function load(data) {
      for (var i=0, n=data.length; i<n; i++) {
        var conf = data[i];
        types[conf.is](desk, conf);
      }
      sync();
    }

    // ––~,–`~–{@   Bootstrap   @}–~,–`~––

    if (document.readyState === "loading") {
      document.onreadystatechange = function () {
        if (document.readyState !== "loading") {
          document.onreadystatechange = null;
          load(data);
        }
      }
    }

    return desk;

})();
