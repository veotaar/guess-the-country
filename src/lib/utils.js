import { iso1A2Code, featuresContaining } from '@rapideditor/country-coder';



export const getCountryCodeFromShortGoogleUrl = async (url) => {
  const res = await fetch(url);

  if(!res.ok) {
    throw new Error(`HTTP error ${r.status}`);
  }

  const fullUrl = res.url;

  const numbers = fullUrl.match(/@([-]?\d+\.\d+),([-]?\d+\.\d+)/).slice(1).map(val => Number(val));

  let temp = numbers[0];
  numbers[0] = numbers[1];
  numbers[1] = temp;

  const countryCode = iso1A2Code(numbers, { level: 'territory' });

  return countryCode;
}

