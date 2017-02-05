(function(){
  var desk = Workdesk; // window.

  desk.reg("mapping", function (sheet, conf) {
    var box = { tag:'div', style:{width:'100%',height:'100%'}, children:[] };
    var panel = sheet.panel(box, 'window mapping', conf.name||'Mapping');
    function update() {
      box.children = conf.items.map(function(item){
        return {tag:'div',classes:['row'],children:[item]};
      });
    }
    update();
    sheet.add(panel, conf.x, conf.y, conf.w, conf.h);
    return panel;
  });

  desk.reg("editor", function (sheet, conf) {
    var id = sheet.uid();
    var box = { tag:'div', attrs:{id:id}, style:{width:'100%',height:'100%'}, children:[conf.text||''] };
    var panel = sheet.panel(box, 'window aceBox', conf.name||'Editor');
    sheet.add(panel, conf.x, conf.y, conf.w, conf.h);
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
