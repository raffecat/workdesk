/* Use this script if you need to support IE 7 and IE 6. */

window.onload = function() {
	function addIcon(el, entity) {
		var html = el.innerHTML;
		el.innerHTML = '<span style="font-family: \'icomoon\'">' + entity + '</span>' + html;
	}
	var icons = {
			'icon-quill' : '&#x21;',
			'icon-film' : '&#x22;',
			'icon-image' : '&#x23;',
			'icon-music' : '&#x24;',
			'icon-file-css' : '&#x25;',
			'icon-file-xml' : '&#x26;',
			'icon-pushpin' : '&#x27;',
			'icon-folder-open' : '&#x28;',
			'icon-folder' : '&#x29;',
			'icon-plus' : '&#x2a;',
			'icon-remove' : '&#x2b;',
			'icon-cog' : '&#x2c;',
			'icon-expand' : '&#x2d;',
			'icon-contract' : '&#x2e;',
			'icon-cancel' : '&#x2f;',
			'icon-checkmark' : '&#x30;',
			'icon-play' : '&#x31;',
			'icon-pause' : '&#x32;',
			'icon-console' : '&#x33;',
			'icon-power-cord' : '&#x34;'
		},
		els = document.getElementsByTagName('*'),
		i, attr, html, c, el;
	for (i = 0; i < els.length; i += 1) {
		el = els[i];
		attr = el.getAttribute('data-icon');
		if (attr) {
			addIcon(el, attr);
		}
		c = el.className;
		c = c.match(/icon-[^\s'"]+/);
		if (c && icons[c[0]]) {
			addIcon(el, icons[c[0]]);
		}
	}
};