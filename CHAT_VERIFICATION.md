# Buyer/seller messaging

- Conversations are keyed by product and buyer account ID, never display name.
- Seller access is limited to products owned by the signed-in seller.
- Buyers start via product Chat Seller; both inboxes have conversation selection.
- Sellers can also open the buyer conversation from an owned order.
- Visible pages poll every 10 seconds and support manual Refresh.
- Reading marks only incoming messages through the last displayed ID and their
  corresponding notifications. Later messages and other threads stay unread.
- Failed sends preserve text. Message bodies and names render as text, not HTML.
- No real customers were messaged during testing.

Migration adds buyer_id and read_at to messages. Existing name-only records are
preserved, but are excluded from customer inboxes because ownership cannot be
proven from names. Admin ticket history retains them; do not auto-assign them.
Older clients using buyer names for seller replies must be replaced by this
release. Deploy backend and both buyer/seller static bundles together.

Tests: test_chat.py (temporary SQLite DB), test_chat_ui.cjs (mock API two-browser
round trip), and the existing seller operation tests. Production PostgreSQL
migration, live sessions and notification delivery remain deployment checks.
