import base64
import json
import unittest
from unittest.mock import patch
import seller_ai
import server

PHOTO = 'data:image/jpeg;base64,' + base64.b64encode(b'\xff\xd8\xfftest\xff\xd9').decode()
PRODUCT = dict(name='Cable', description='Black cable', variants=['Black'], questions='Confirm connector', photo_indices=[0])


def result(value, annotations=None):
    return {'status': 'completed', 'output': [{'content': [{'type': 'output_text', 'text': value, 'annotations': annotations or []}]}]}


class SellerAiTest(unittest.TestCase):
    def test_endpoint_rejects_non_sellers(self):
        handler=object.__new__(server.Handler)
        for user in (None, {'id':1,'role':'buyer'}, {'id':3,'role':'admin'}):
            handler.current_user=lambda: user
            with self.assertRaises(PermissionError):handler.seller_ai_listing({'action':'draft','images':[PHOTO]})

    def test_photo_validation(self):
        self.assertEqual(seller_ai.photos([PHOTO]), [PHOTO])
        for value in ([], [PHOTO]*7, ['https://internal/secret'], ['data:image/jpeg;base64,bad'], ['x'*1500001], None):
            with self.subTest(value=str(value)[:30]), self.assertRaises(ValueError):
                seller_ai.photos(value)

    def test_draft_uses_images_and_validates_indices(self):
        with patch.object(seller_ai, 'response', return_value=result(json.dumps({'products':[PRODUCT]}))) as call:
            self.assertEqual(seller_ai.draft({'images':[PHOTO]}, 'key', 'model')['products'], [PRODUCT])
            payload=call.call_args.args[0]
            self.assertEqual(payload['input'][0]['content'][1]['image_url'], PHOTO)
            self.assertTrue(payload['text']['format']['strict'])
        for indices in ([-1], [1], [], ['0']):
            with patch.object(seller_ai, 'response', return_value=result(json.dumps({'products':[{**PRODUCT,'photo_indices':indices}]}))):
                with self.assertRaises(ValueError):seller_ai.draft({'images':[PHOTO]}, 'key', 'model')

    def test_missing_key_no_fake_success(self):
        with self.assertRaisesRegex(ValueError, 'not configured'):
            seller_ai.draft({'images':[PHOTO]}, '', 'model')

    def test_search_requires_sources(self):
        with patch.object(seller_ai,'response',return_value=result('RM10 made up')):
            data=seller_ai.research({'query':'cable'},'key')
            self.assertEqual(data['sources'],[])
            self.assertNotIn('RM10',data['answer'])

    def test_search_citations_and_tool(self):
        annotation={'type':'url_citation','title':'Store','url':'https://example.com/product'}
        with patch.object(seller_ai,'response',return_value=result('Listed RM10',[annotation])) as call:
            data=seller_ai.research({'query':'cable'},'key')
            self.assertEqual(data['sources'][0]['url'],annotation['url'])
            self.assertEqual(call.call_args.args[0]['tools'],[{'type':'web_search'}])
            self.assertEqual(call.call_args.args[0]['tool_choice'],'required')

    def test_throttle(self):
        seller_ai._requests.clear()
        seller_ai.throttle((999,'draft'))
        with self.assertRaises(ValueError):seller_ai.throttle((999,'draft'))
        seller_ai.throttle((999,'research'))


if __name__ == '__main__': unittest.main()
