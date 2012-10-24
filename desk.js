(function(){

    var nextId = 1;
    function uniqueId() { return 'id'+(nextId++); }

    function newElem(tag, attrs) {
        var elem = document.createElement(tag);
        for (var k in attrs)
            elem.setAttribute(k, attrs[k]);
        return elem;
    }

    function addToDesk(panel) {
        // FIXME: IE7 does not allow this.
        document.body.appendChild(panel);
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
            elem.style.left = (mpos.x - orgX)+'px';
            elem.style.top = (mpos.y - orgY)+'px';
        };
        // bring the panel to the front.
        var maxZ = 0;
        for (var n=document.body.firstChild; n; n=n.nextSibling) {
            var s = n.style, z = s && +s.zIndex;
            if (z > maxZ) maxZ = z;
        }
        elem.style.zIndex = maxZ + 1;
    }

    document.body.onmousedown = function(e) {
        e = e || event;
        var elem = e.target || e.srcElement;
        var body = document.body;
        // find a parent with an id (a panel or something else)
        while (elem && elem !== body && !elem.id) elem = elem.parentNode;
        // only drag children of the body.
        if (elem && elem.canDrag && elem.parentNode === body)
            startDrag(e, elem);
    };

    function newPanel(html, cls, title) {
        var panel = newElem("div", {"class":"panel "+(cls||'')});
        panel.id = uniqueId();
        title = title ? '<div class="title"><input value="'+title+'" type="text" class="title-inp" spellcheck="false"></div>' : '';
        panel.innerHTML = title+'<div class="panel-content">'+html+'</div>';
        return panel;
    }

    var newBtn = newPanel('+', 'newBtn');
    addToDesk(newBtn);
    newBtn.onclick = function(e) {
        newEditor('untitled');
    };

    function newMapping(title, body) {
        var id = uniqueId();
        var panel = newPanel('<div id="'+id+'" style="width:100%;height:100%">'+body+'</div>', 'window mapping', title);
        panel.style.left = '10px';
        panel.style.top = '10px';
        panel.style.width = '300px';
        panel.style.height = '400px';
        addToDesk(panel);
        panel.canDrag = true;
    }

    var nextPos = 10;
    function newEditor(title, text) {
        var id = uniqueId();
        var panel = newPanel('<div id="'+id+'" style="width:100%;height:100%">'+text+'</div>', 'window aceBox', title);
        panel.style.left = (400+nextPos)+'px';
        panel.style.top = (40+nextPos)+'px';
        nextPos += 50;
        addToDesk(panel); // ace init requires in-document.
        panel.canDrag = true;
        var editor = ace.edit(id);
        editor.setTheme("ace/theme/monokai");
        editor.getSession().setMode("ace/mode/javascript");
        editor.setShowPrintMargin(false);
        editor.setHighlightActiveLine(false);
        editor.setShowFoldWidgets(false);
        editor.renderer.setShowGutter(false);
        return panel;
    }

    newMapping("localhost:8000",
        "<div class='row'>/api/communities</div>"+
        "<div class='row'>/api/communities/:page</div>"+
        "<div class='row'>/api/communities/:page/membership</div>"+
        "<div class='row'>/api/communities/:page/members</div>"+
        "<div class='row'>/api/communities/:page/forum/:topic</div>"+
        "<div class='row'>/api/communities/:page/wiki/:topic</div>"+
        "<div class='row'>/api/communities/:page/wiki/:topic/edit</div>"+
        "<div class='row'>/api/communities/:page/edit</div>"+
        "<div class='row'>/api/communities/:page/new</div>"+
        "<div class='row'>/api/communities/new</div>"+
        "<div class='row'>/api/forum/:forum/posts</div>"+
        "<div class='row'>/api/forum/:forum/newpost</div>"+
        "<div class='row'>/api/forum/:forum/:post/edit</div>"+
        "<div class='row'>/api/forum/:forum/:post/delete</div>"
    );
    newEditor("/api/forum/:forum/posts", "function(){}");

})();
