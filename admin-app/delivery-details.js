function deliveryDetails(order) {
  if (!order.delivery_data) return '';
  try {
    const d = JSON.parse(order.delivery_data), c = d.context;
    const pmRider = ['pm_express', 'pm_pooling'].includes(d.provider);
    const pooling = d.provider === 'pm_pooling';
    const point = p => `${esc(p.address)} (${esc(p.coordinates.lat)}, ${esc(p.coordinates.lng)})`;
    return `<details style="max-width:320px;overflow-wrap:anywhere"><summary>${pooling ? 'PM Pooling' : pmRider ? 'PM Express' : 'Courier delivery'}</summary>
      <p>${pmRider ? 'Assign a Pasar Malam rider. Do not book Lalamove.' : order.tracking_no ? 'Tracking recorded: '+esc(order.tracking_no) : 'Not booked. Manual courier booking required after payment.'}</p>
      ${pooling ? '<p>Up to 5 working days. Confirm online payment before dispatch.</p>' : ''}
      <p>Pickup: ${point(c.pickup)}</p><p>Delivery: ${point(c.dropoff)}</p>
      <p>Pickup contact: ${esc(d.pickup_contact?.name || '')} ${esc(d.pickup_contact?.phone || '')}</p>
      <p>Recipient: ${esc(d.recipient?.name || '')} ${esc(d.recipient?.phone || '')}</p>
      <p>${esc(c.mode)} | ${esc(c.service_type)} | ${esc(pooling ? 'Pooled pickup' : c.schedule_at || 'Immediate pickup')}</p>
      <p>Buyer delivery charge: ${money(order.logistics_fee)}</p>
      <p>Courier: ${money(Number(order.logistics_fee || 0) - Number(order.logistics_admin_fee || 0))} | PasarMalam logistics admin fee: ${money(order.logistics_admin_fee || 0)}</p>
      <p>${pmRider ? 'Courier quotation is a price reference only, not a booking.' : 'Quotation is not a booking. Requote when booking; do not charge the buyer extra without their agreement.'}</p></details>`;
  } catch (_) { return '<p>Delivery details unavailable. Review before dispatch.</p>'; }
}
