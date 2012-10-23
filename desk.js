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

    function newPanel(html, cls) {
        var panel = newElem("div", {"class":"panel "+(cls||'')});
        panel.id = uniqueId();
        panel.innerHTML = '<div class="panel-back"></div><div class="panel-edge"></div><div class="panel-content">'+html+'</div>';
        return panel;
    }

    var newBtn = newPanel('+', 'newBtn');
    addToDesk(newBtn);
    newBtn.onclick = function(e) {
        newEditor();
        //if (e) e.stopPropagation();
        //else event.cancelBubble = true;
    };

    var nextPos = 10;
    function newEditor() {
        var id = uniqueId();
        var panel = newPanel('<div id="'+id+'" style="width:100%;height:100%"></div>', 'aceBox');
        panel.style.left = nextPos+'px';
        panel.style.top = nextPos+'px';
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

    newEditor();

})();
