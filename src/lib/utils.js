import { featuresContaining, aggregateFeature } from '@rapideditor/country-coder';
import removeAccents from 'remove-accents';

export const normalizeAnswer = (str) => {
  return removeAccents(str).toUpperCase().replace(/[!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]/g, '');
}

export const extractAfterCommand = (input) => {
  const match = input.match(/^![^\s]+\s+(.*)$/);
  return match ? match[1] : '';
}

const removeItemsFromArray = (array, valuesToRemove) => {
  valuesToRemove.forEach(value => {
    let index = array.indexOf(value);
    while (index !== -1) {
      array.splice(index, 1);
      index = array.indexOf(value);
    }
  });
  return array;
}


export const getPossibleAnswers = async (latlong) => {
  const possibleAnswers = [];
  const wikiData = [];
  const features = featuresContaining(latlong);

  console.log(features);

  const addFeature = (feature) => {
    possibleAnswers.push(feature.properties?.iso1A2);
    possibleAnswers.push(feature.properties?.iso1A3);
    possibleAnswers.push(feature.properties?.nameEn);
    wikiData.push(feature.properties?.wikidata);
    feature.properties.aliases?.forEach((alias) => {
      possibleAnswers.push(alias);
    });
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

  console.log(filteredAnswers);

  // const languages = ['tr', 'en', 'se', 'de', 'fr', 'es', 'pt', 'nl', 'it'];
  const languages = ['tr', 'en'];

  const wikiResponse = await fetch(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${wikiDataQueryIds}&props=labels&languages=${languages.join('|')}&format=json`);
  const data = await wikiResponse.json();

  // add languages
  filteredWikiData.forEach((entity) => {
    languages.forEach((lang) => filteredAnswers.push(data.entities[entity].labels[lang]?.value));
  })

  const cleanAnswers = filteredAnswers.filter((val) => val !== undefined && val !== null).map((val) => normalizeAnswer(val));

  if(cleanAnswers.includes('MARTINIQUE')) {
    cleanAnswers.push('MARTINIK');
  }

  if(cleanAnswers.includes('USA')) {
    cleanAnswers.push('ABD');
  }

  if(cleanAnswers.includes('TAIWAN')) {
    cleanAnswers.push('TAYVAN');
  }

  if(cleanAnswers.includes('FRENCH GUIANA')) {
    cleanAnswers.push('FRANSIZ GUYANASI');
  }

  if(cleanAnswers.includes('NORTHERN CYPRUS')) {
    cleanAnswers.push('KKTC');
  }

  if(cleanAnswers.includes('CRIMEA')) {
    removeItemsFromArray(cleanAnswers, ['RU', 'RUS', 'RUSSIA', 'RUSYA'])
  }

  const uniqueCleanAnswers = [...new Set(cleanAnswers)];

  return uniqueCleanAnswers;
}

export const getPossibleAnswersFromShortGoogleUrl = async (url) => {
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

  const temp = numbers[0];
  numbers[0] = numbers[1];
  numbers[1] = temp;

  const possibleAnswers = await getPossibleAnswers(numbers);
  console.log('------------POSSIBLE ANSWERS------------');
  console.log(possibleAnswers);
  console.log('----------------------------------------');

  return possibleAnswers;
}
