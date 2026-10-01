import re

REGIONS = ('Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan',
           'Pahang', 'Pulau Pinang', 'Perak', 'Perlis', 'Selangor',
           'Terengganu', 'Sabah', 'Sarawak', 'Kuala Lumpur', 'Labuan', 'Putrajaya')


def registration_address(data):
    """Build the saved delivery address from validated registration fields."""
    fields = data.get('address_fields')
    if not isinstance(fields, dict):
        raise ValueError('Complete your delivery address, postcode, city and state.')
    street, unit, postcode, city, state = (
        str(fields.get(key) or '').strip()
        for key in ('street', 'unit', 'postcode', 'city', 'state'))
    if len(street) < 4 or len(street) > 300:
        raise ValueError('Enter the street or building and house number where applicable.')
    if not re.fullmatch(r'[0-9]{5}', postcode):
        raise ValueError('Enter a five-digit postcode.')
    if len(city) < 2 or len(city) > 100 or not any(c.isalpha() for c in city):
        raise ValueError('Enter the city.')
    if state not in REGIONS:
        raise ValueError('Select the state.')
    if len(unit) > 120:
        raise ValueError('Unit / floor is too long.')
    return ', '.join(part for part in (unit, street, f'{postcode} {city}', state, 'Malaysia') if part)
