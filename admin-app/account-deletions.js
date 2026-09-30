(() => {
  const section = document.createElement('section');
  section.id = 'account-deletions';
  section.className = 'panel';
  const style = document.createElement('style');
  style.textContent = '#account-deletions input[type="checkbox"]{width:18px;height:18px;min-height:0;flex:0 0 18px;margin:3px 0 0}#account-deletions p>label{display:flex;align-items:flex-start;gap:8px}#account-deletions button{margin:4px 4px 4px 0;white-space:normal}';
  document.head.appendChild(style);
  section.innerHTML = '<h3>Account deletion requests</h3><button class="soft" id="refresh-deletions">Refresh requests</button><p id="deletion-error" role="status"></p><div id="deletion-rows"></div>';
  document.querySelector('main').prepend(section);
  const rows = section.querySelector('#deletion-rows');
  const error = section.querySelector('#deletion-error');
  const date = ts => new Date(ts * 1000).toLocaleDateString();
  async function load() {
    error.textContent = 'Loading deletion requests...';
    try {
      const result = await api('/api/admin/account-deletions');
      rows.innerHTML = result.requests.map(r => `<article class="item" style="overflow-wrap:anywhere">
        <h4>Request #${Number(r.id)} &middot; Account #${Number(r.user_id)}</h4>
        <p>${esc(r.email)} &middot; ${esc(r.role)} &middot; <strong>${esc(r.status)}</strong></p>
        <p>Requested ${date(r.requested_at)}. Due ${date(r.due_at)}${r.status !== 'completed' && r.due_at * 1000 < Date.now() ? ' - OVERDUE' : ''}.</p>
        <p>${esc(r.fulfilment_note)}</p>
        ${['requested','reviewing'].includes(r.status) ? `<button class="soft" type="button" data-preview="${Number(r.id)}">Review data for erasure</button><div data-preview-area="${Number(r.id)}"></div>` : ''}
        ${r.cleanup ? `<details><summary>External cleanup and retained records</summary><p>Retention: ${esc(r.cleanup.retention_reason || 'No identity retained')} ${r.cleanup.retention_until ? '- expires '+date(r.cleanup.retention_until) : ''}</p><ul>${(r.cleanup.inventory.provider_checks || []).map(x=>`<li>${esc(x)}</li>`).join('')}</ul><ul>${(r.cleanup.inventory.urls_to_review || []).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></details>` : ''}
        ${r.status === 'completed' ? `<p>Completed ${date(r.completed_at)}</p>` : `<form data-request="${Number(r.id)}">
          <p><a href="users.html">Review account</a> &middot; <a href="orders.html">Review orders</a></p>
          <label>Fulfilment / retention notes<textarea name="note" required minlength="10" maxlength="2000" style="width:100%;max-width:100%">${esc(r.fulfilment_note)}</textarea></label>
          <p><label><input type="checkbox" name="data_reviewed"> Account and associated data removed, including uploads and provider copies</label></p>
          <p><label><input type="checkbox" name="retention_reviewed"> Any legally retained records have a documented reason and expiry; backups reviewed</label></p>
          <p><label><input type="checkbox" name="confirmation_sent"> Completion confirmation sent to the registered email</label></p>
          <button class="soft" name="action" value="reviewing">Save review notes</button>
          <button class="danger" name="action" value="completed">Record completed deletion</button>
          <p class="muted">Recording completion does not erase data or send email. The account must already be removed. Suspension is not deletion.</p>
        </form>`}
      </article>`).join('') || '<p>No deletion requests.</p>';
      error.textContent = '';
    } catch (e) { error.textContent = e.message; }
  }
  section.querySelector('#refresh-deletions').onclick = load;
  section.addEventListener('click', async event => {
    const button = event.target.closest('[data-preview]');
    if (!button) return;
    button.disabled = true;
    try {
      const id = Number(button.dataset.preview);
      const {preview:p} = await api('/api/admin/account-deletions', {method:'POST',body:JSON.stringify({action:'preview',id})});
      const area = section.querySelector(`[data-preview-area="${id}"]`);
      area.innerHTML = `<p>${Object.entries(p.counts).map(([k,v])=>`${esc(k)}: ${Number(v)}`).join(' &middot; ')}</p>
        <ul>${p.blockers.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>
        <form data-purge="${id}">
        <p>Permanent erasure removes the local account, profile, listings/content and stored credentials. Necessary transaction totals remain. External cleanup must still be completed.</p>
        ${['legacy_reviews','legacy_messages'].map(kind=>`<h5>${kind === 'legacy_reviews' ? 'Legacy reviews' : 'Legacy messages'}</h5><p>Select only records verified to belong to this account. A matching name is not proof.</p>${p[kind].map(x=>`<p><label><input type="checkbox" name="${kind}" value="${Number(x.id)}"> #${Number(x.id)}: ${esc(x.title || '')} ${esc(x.body)}</label></p>`).join('') || '<p>No candidates.</p>'}`).join('')}
        <p><label><input type="checkbox" name="legacy_reviewed" required> I verified legacy record ownership and selected only this account's records.</label></p>
        <label>Financial retention reason<textarea name="retention_reason" maxlength="1000" ${p.counts.orders || p.counts.wallet ? 'required minlength="15"' : ''} style="width:100%"></textarea></label>
        <label>Retention expiry<input type="date" name="retention_until" ${p.counts.orders || p.counts.wallet ? 'required' : ''}></label>
        <p>Retain only identity fields required on financial records:</p>
        ${['name','address','ssm_number'].map(k=>`<p><label><input type="checkbox" name="retained_fields" value="${k}"> ${esc(k.replaceAll('_',' '))}</label></p>`).join('')}
        <label>Type account email (${esc(p.email)})<input name="confirm_email" type="email" required autocomplete="off"></label>
        <p><label><input type="checkbox" name="confirm_purge" required> Permanently erase this account's local data.</label></p>
        <button class="danger" type="submit" ${p.blockers.length ? 'disabled' : ''}>Erase local account data</button>
        </form>`;
    } catch(e) { error.textContent = e.message; }
    finally { button.disabled = false; }
  });
  section.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.target;
    if(form.dataset.purge) {
      if(!confirm('Permanently erase this account and its associated local data? This cannot be undone.')) return;
      const values = new FormData(form);
      const data = {action:'purge',id:Number(form.dataset.purge),legacy_reviewed:values.has('legacy_reviewed'),confirm_purge:values.has('confirm_purge'),confirm_email:values.get('confirm_email'),retention_reason:values.get('retention_reason'),retention_until:values.get('retention_until') ? Math.floor(new Date(values.get('retention_until')+'T00:00:00Z').getTime()/1000) : 0};
      for(const key of ['legacy_reviews','legacy_messages','retained_fields'])data[key]=values.getAll(key);
      const submit = form.querySelector('button');submit.disabled=true;
      try { await api('/api/admin/account-deletions',{method:'POST',body:JSON.stringify(data)});await load(); }
      catch(e) { error.textContent=e.message; }
      finally {submit.disabled=false;}
      return;
    }
    const status = event.submitter.value;
    const data = {id: Number(form.dataset.request), status, note: form.elements.note.value};
    for (const key of ['data_reviewed', 'retention_reviewed', 'confirmation_sent']) data[key] = form.elements[key].checked;
    if (status === 'completed' && !confirm('Record this request as completed? Only continue after actual data deletion and the confirmation email.')) return;
    form.querySelectorAll('button').forEach(b => b.disabled = true);
    try {
      await api('/api/admin/account-deletions', {method: 'POST', body: JSON.stringify(data)});
      await load();
    } catch (e) { error.textContent = e.message; }
    finally { form.querySelectorAll('button').forEach(b => b.disabled = false); }
  });
  load();
})();
