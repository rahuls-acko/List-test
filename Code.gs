/*
 * Placement Study — Google Sheet collector (v2: two journeys per person)
 * Paste into Extensions → Apps Script, then Deploy → Manage deployments → edit →
 * Version: New version → Deploy. The web-app URL stays the same.
 *
 * Tabs:
 *   Responses — one row per participant (device, order, preference taps)
 *   Tasks     — one row per participant per journey per screen
 * A participant id is written once. Tabs whose header row no longer matches
 * (an older version of this study) are renamed "<name> (old)" and fresh ones
 * are created, so old data is kept aside, never mixed in.
 *
 * resetData(): run it from the editor (Run ▸ resetData) to clear both tabs.
 */

var RESP_HEAD = ['received_at', 'pid', 'device', 'order', 'os', 'touch', 'viewport', 'finished_at',
  'pref_list', 'pref_list_first', 'pref_list_ms', 'pref_toggles', 'pref_toggles_first', 'pref_toggles_ms'];
var TASK_HEAD = ['pid', 'device', 'order', 'journey', 'screen', 'placement', 'success', 'time_ms', 'first_tap_ms', 'taps', 'wrong', 'undo',
  'dead_taps', 'first_target', 'pause_before_finish_ms', 'scrolls', 'first_tap_correct', 'first_fix_ms', 'found_select_ms',
  'row_taps_before_select', 'used_search', 'used_select_all'];

function sheet(name, head) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (sh) {
    var cur = sh.getLastColumn() ? sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0] : [];
    if (cur.join('|') !== head.join('|')) {
      var old = name + ' (old)', i = 2;
      while (ss.getSheetByName(old)) old = name + ' (old ' + (i++) + ')';
      sh.setName(old);
      sh = null;
    }
  }
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(head);
    sh.getRange(1, 1, 1, head.length).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function doPost(e) {
  var out = { ok: false };
  try {
    var d = JSON.parse(e.postData.contents);
    if (!d || !d.pid) throw new Error('no pid');
    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      var resp = sheet('Responses', RESP_HEAD);
      var tasks = sheet('Tasks', TASK_HEAD);
      var pids = resp.getLastRow() > 1 ? resp.getRange(2, 2, resp.getLastRow() - 1, 1).getValues().map(function (r) { return String(r[0]); }) : [];
      if (pids.indexOf(String(d.pid)) === -1) {
        var pr = d.pr || {}, env = d.env || {};
        var pl = pr.list || {}, pt = pr.toggles || {};
        resp.appendRow([new Date(), d.pid, d.d, d.order || '', env.os || '', env.touch || 0, (env.vw || '') + 'x' + (env.vh || ''), d.at || '',
          pl.pick || '', pl.first || '', pl.t || '', pt.pick || '', pt.first || '', pt.t || '']);
        var rows = [];
        Object.keys(d.t || {}).forEach(function (key) {
          var x = d.t[key];
          rows.push([d.pid, d.d, d.order || '', x.j, x.k, x.v === 'L' ? 'leading' : 'trailing', x.ok, x.t, x.tf, x.taps, x.wrong, x.undo,
            x.dead, x.ft, x.gap, x.scr, v(x.firstOk), v(x.fix), v(x.modeAt), v(x.navTaps), v(x.usedSearch), v(x.usedAll)]);
        });
        if (rows.length) tasks.getRange(tasks.getLastRow() + 1, 1, rows.length, TASK_HEAD.length).setValues(rows);
      }
      out = { ok: true, pid: d.pid };
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    out = { ok: false, error: String(err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function v(x) { return x === undefined || x === null ? '' : x; }

// Plain GET confirms the deployment works. ?data=1 returns both tabs as JSON for the page's #results view.
function doGet(e) {
  if (e && e.parameter && e.parameter.data === '1') {
    var out = { responses: readAll('Responses'), tasks: readAll('Tasks') };
    return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput('Placement Study collector v2 is running.');
}

function readAll(name) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh || sh.getLastRow() < 2) return [];
  var vals = sh.getDataRange().getValues();
  var head = vals[0];
  return vals.slice(1).map(function (r) {
    var o = {};
    head.forEach(function (k, i) { var x = r[i]; o[k] = x instanceof Date ? x.toISOString() : x; });
    return o;
  });
}

// Clears every data row in Responses and Tasks (headers stay). Run from the editor.
function resetData() {
  ['Responses', 'Tasks'].forEach(function (name) {
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
    if (sh && sh.getLastRow() > 1) sh.deleteRows(2, sh.getLastRow() - 1);
  });
}
