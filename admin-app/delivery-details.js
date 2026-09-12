function deliveryDetails(order) {
  if (!order.delivery_data) return '';
  try {
    const d = JSON.parse(order.delivery_data), c = d.context;
    const point = p => `${esc(p.address)} (${esc(p.coordinates.lat)}, ${esc(p.coordinates.lng)})`;
    return `<details style="max-width:320px;overflow-wrap:anywhere"><summary>Lalamove delivery</summary>
      <p>${order.tracking_no ? 'Tracking recorded: '+esc(order.tracking_no) : 'Not booked. Manual courier booking required after payment.'}</p>
      <p>Pickup: ${point(c.pickup)}</p><p>Delivery: ${point(c.dropoff)}</p>
      <p>Pickup contact: ${esc(d.pickup_contact?.name || '')} ${esc(d.pickup_contact?.phone || '')}</p>
      <p>Recipient: ${esc(d.recipient?.name || '')} ${esc(d.recipient?.phone || '')}</p>
      <p>${esc(c.mode)} | ${esc(c.service_type)} | ${esc(c.schedule_at || 'Immediate pickup')}</p>
      <p>Buyer delivery charge: ${money(order.logistics_fee)}</p>
      <p>Quotation is not a booking. Requote when booking; do not charge the buyer extra without their agreement.</p></details>`;
  } catch (_) { return '<p>Delivery details unavailable. Review before dispatch.</p>'; }
}
