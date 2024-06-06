import { iso1A2Code, featuresContaining } from '@rapideditor/country-coder';

export const getPossibleAnswers = async (latlong) => {
  const possibleAnswers = [];
  const wikiData = [];
  const features = featuresContaining(latlong);

  const addFeature = (feature) => {
    possibleAnswers.push(feature.properties?.iso1A2);
    possibleAnswers.push(feature.properties?.iso1A3);
    possibleAnswers.push(feature.properties?.nameEn);
    wikiData.push(feature.properties?.wikidata);
  }

  // if the lowest level is 'country'
  if(features[0].properties.level === 'country' && features[1].properties.level !== 'sharedLandform') {
    addFeature(features[0]);
  } else if (features[0].properties.level === 'country' && features[1].properties.level === 'sharedLandform') {
    addFeature(features[0]);
    addFeature(features[1]);
  } else {
    features.forEach((feature) => {
      const level = feature.properties.level;

      if(level === 'subterritory'){
        addFeature(feature)
      }

      if(level === 'territory'){
        addFeature(feature)
      }

      if(level === 'subcountryGroup'){
        addFeature(feature)
      }

      if(level === 'country'){
        addFeature(feature)
      }
    })
  }

  const filteredAnswers = possibleAnswers.filter((val) => val !== undefined && val !== null);
  const filteredWikiData = wikiData.filter((val) => val !== undefined && val !== null);
  const wikiDataQueryIds = filteredWikiData.join('|');

  const wikiResponse = await fetch(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${wikiDataQueryIds}&props=labels&languages=tr&format=json`);
  const data = await wikiResponse.json();

  filteredWikiData.forEach((entity) => {
    if(!data.entities[entity].labels.tr) return;
    filteredAnswers.push(data.entities[entity].labels.tr.value);
  })

  return filteredAnswers;
}

export const getCountryCodeFromShortGoogleUrl = async (url) => {
  if(!url.startsWith('https://maps.app.goo.gl/')) {
    throw new Error('ERROR: Wrong google maps url format.');
  }

  const res = await fetch(url);

  if(!res.ok) {
    throw new Error('ERROR: Cannot fetch the google maps link');
  }

  const fullUrl = res.url;
  const match = fullUrl.match(/@([-]?\d+\.\d+),([-]?\d+\.\d+)/);

  if(!match) {
    throw new Error('ERROR: Cannot fetch the google maps link');
  }

  const numbers = match.slice(1).map(val => Number(val));

  let temp = numbers[0];
  numbers[0] = numbers[1];
  numbers[1] = temp;

  const countryCode = iso1A2Code(numbers, { level: 'subterritory' });
  // console.log(featuresContaining(numbers));

  const possibleAnswers = await getPossibleAnswers(numbers);
  console.log('------------POSSIBLE ANSWERS------------');
  console.log(possibleAnswers);
  console.log('----------------------------------------');

  return countryCode;
}
