(function(){
  var desk = Workdesk; // window.

  function row(text, click) {
    return {tag:'div',classes:['row'],children:[text],onclick:click};
  }

  desk.reg("palette", function (sheet, conf) {
    var menu = desk.types().map(function(name){
      if (name === 'palette') return;
      function click() { sheet.spawn(name); }
      return row(name, click);
    });
    var panel = sheet.panel(menu, 'mapping', 'Palette', conf.x, conf.y, conf.w||150, conf.h||300);
    return panel;
  });

  desk.reg("read-file", function (sheet, conf) {
    var filename = {tag:'div',classes:['row'],children:['filename'] };
    var box = { tag:'div', style:{width:'100%',height:'100%'}, children:[filename] };
    var panel = sheet.panel(box, 'read-file mapping', 'read-file', conf.x, conf.y, conf.w||300, conf.h||100);
    return panel;
  });

  desk.reg("parse-json", function (sheet, conf) {
    var filename = {tag:'div',classes:['row'],children:['filename'] };
    var box = { tag:'div', style:{width:'100%',height:'100%'}, children:[filename] };
    var panel = sheet.panel(box, 'parse-json mapping', 'parse-json', conf.x, conf.y, conf.w||300, conf.h||100);
    return panel;
  });

  desk.reg("mapping", function (sheet, conf) {
    var box = { tag:'div', style:{width:'100%',height:'100%'}, children:[] };
    var panel = sheet.panel(box, 'mapping', conf.name||'Mapping', conf.x, conf.y, conf.w||400, conf.h||300);
    function update() {
      box.children = (conf.items||[]).map(function(item){
        return {tag:'div',classes:['row'],children:[item]};
      });
    }
    update();
    return panel;
  });

  desk.reg("editor", function (sheet, conf) {
    var id = sheet.uid();
    var box = { tag:'div', attrs:{id:id}, style:{width:'100%',height:'100%'}, children:[conf.text||''] };
    var panel = sheet.panel(box, 'window aceBox', conf.name||'Editor', conf.x, conf.y, conf.w||400, conf.h||300);
    sheet.later(function(){
      // ace init requires in-document.
      var editor = ace.edit(id);
      editor.setTheme("ace/theme/monokai");
      editor.getSession().setMode("ace/mode/javascript");
      editor.setShowPrintMargin(false);
      editor.setHighlightActiveLine(false);
      editor.setShowFoldWidgets(false);
      editor.renderer.setShowGutter(false);
    });
    return panel;
  });

})();
