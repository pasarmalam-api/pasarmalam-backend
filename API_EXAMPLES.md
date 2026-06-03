# API Examples

## Add Product

```bash
curl -X POST http://localhost:8080/api/products ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Used Samsung S22\",\"shop\":\"Mobile Malam\",\"category\":\"Phones\",\"price\":1199,\"stock\":2,\"condition\":\"Used\",\"price_mode\":\"Negotiable\"}"
```

## Send Buyer Message

```bash
curl -X POST http://localhost:8080/api/messages ^
  -H "Content-Type: application/json" ^
  -d "{\"product_id\":1,\"buyer_name\":\"Aina\",\"seller_name\":\"Mobile Malam\",\"sender_role\":\"buyer\",\"body\":\"Can nego?\"}"
```

## Add Review

```bash
curl -X POST http://localhost:8080/api/reviews ^
  -H "Content-Type: application/json" ^
  -d "{\"product_id\":1,\"buyer_name\":\"Aina\",\"rating\":5,\"title\":\"Good seller\",\"body\":\"Fast reply and item matched listing.\"}"
```

## Create Order

```bash
curl -X POST http://localhost:8080/api/checkout ^
  -H "Content-Type: application/json" ^
  -d "{\"buyer_name\":\"Aina\",\"product_id\":1,\"quantity\":1,\"total\":899,\"logistics_method\":\"standard_rider\",\"logistics_fee\":4.9}"
```
