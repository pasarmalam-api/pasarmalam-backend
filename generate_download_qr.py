"""Generate and decode-check the Android store QR, without a third-party redirect."""
from pathlib import Path
import qrcode
import cv2

URL = 'https://play.google.com/store/apps/details?id=com.pasarmalam.app'
target = Path(__file__).parent / 'landing-site-v2' / 'assets' / 'pasarmalam-download-qr.png'
target.parent.mkdir(parents=True, exist_ok=True)
qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_Q, box_size=16, border=4)
qr.add_data(URL)
qr.make(fit=True)
qr.make_image(fill_color='black', back_color='white').save(target)
assert cv2.QRCodeDetector().detectAndDecode(cv2.imread(str(target)))[0] == URL
print('Verified QR:', target)
