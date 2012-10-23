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

    function startDrag(e, elem) {
        e = e || event;
        var x = e.pageX || e.clientX, y = e.pageY || e.clientY;
        var orgX = x - (elem.style.left||'').replace('px','');
        var orgY = y - (elem.style.top||'').replace('px','');
        document.body.onmouseup = function() {
            // FIXME: use capture so we can't miss mouseup.
            document.body.onmouseup = null;
            document.body.onmousemove = null;
        };
        document.body.onmousemove = function(e) {
            e = e || event;
            var x = e.pageX || e.clientX, y = e.pageY || e.clientY;
            elem.style.left = (x - orgX)+'px';
            elem.style.top = (y - orgY)+'px';
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
