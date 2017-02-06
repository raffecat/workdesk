(function(){
  var desk = Workdesk; // window.

  function row(text, click) {
    return {tag:'div',classes:['row'],children:[text],onclick:click};
  }

  function field(label, value, onchange) {
    function changed(value) {
      input.props.value = value; // save for next DOM update.
      if (onchange) onchange(value);
    }
    var input = {tag:'input',classes:['field-input'],props:{value:value},onchange:changed,onkeyup:changed};
    return {tag:'div',classes:['row'],children:[
      {tag:'span',classes:['field-name'],children:[label]},
      {tag:'span',classes:['field-value'],children:[input]}
    ]};
  }

  desk.reg("palette", function (sheet, conf) {
    var menu = desk.types().map(function(name){
      if (name === 'palette') return;
      function click() { sheet.spawn(name); }
      return row(name, click);
    });
    var panel = sheet.panel(menu, 'scrolling', 'Palette', conf.x, conf.y, conf.w||150, conf.h||300);
    return panel;
  });

  desk.reg("read-file", function (sheet, conf) {
    var filename = field('file', conf.file||'');
    var encoding = field('encoding', conf.encoding||'');
    var contents = [filename, encoding];
    var panel = sheet.panel(contents, '', 'Read File', conf.x, conf.y, conf.w||300, conf.h||87);
    return panel;
  });

  desk.reg("parse-json", function (sheet, conf) {
    var from = field('text', conf.text||'');
    var contents = [from];
    var panel = sheet.panel(contents, '', 'Parse JSON', conf.x, conf.y, conf.w||300, conf.h||87);
    return panel;
  });

  desk.reg("http-server", function (sheet, conf) {
    var port = field('port', conf.port||'80');
    var bind = field('bind', conf.address||'::');
    var contents = [port, bind];
    var panel = sheet.panel(contents, '', 'HTTP Server', conf.x, conf.y, conf.w||300, conf.h||87);
    return panel;
  });

  desk.reg("mapping", function (sheet, conf) {
    var box = { tag:'div', style:{width:'100%',height:'100%'}, children:[] };
    var panel = sheet.panel(box, 'scrolling', 'Mapping', conf.x, conf.y, conf.w||400, conf.h||300);
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
    var box = { tag:'div', attrs:{id:id}, style:{width:'100%',height:'100%'} };
    var panel = sheet.panel(box, 'is-ace-panel', conf.name||'Editor', conf.x, conf.y, conf.w||400, conf.h||300);
    sheet.later(function(){
      // ace init requires in-document.
      var editor = ace.edit(id);
      editor.setTheme("ace/theme/monokai");
      editor.getSession().setMode("ace/mode/javascript");
      editor.setShowPrintMargin(false);
      editor.setHighlightActiveLine(false);
      editor.setShowFoldWidgets(false);
      editor.renderer.setShowGutter(false);
      editor.setValue(conf.text||'');
      panel.editor = editor;
    });
    return panel;
  });

})();
