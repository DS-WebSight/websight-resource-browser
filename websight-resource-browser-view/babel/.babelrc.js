const importMap = require('./import-map.json');

prepareAliasesMap = () => {
  const { rootDir, aliases } = importMap;

  Object.keys(aliases).forEach((key) =>
      aliases[key] = `${rootDir}${aliases[key]}`
  );

  return aliases;
}

prepareAliasesMapForDevelopment = () => {
  const { aliases, devAliases } = importMap;

  Object.keys(devAliases).forEach((devKey) =>
    Object.keys(aliases)
      .filter((key) => aliases[key].includes(devKey))
      .forEach((key) => aliases[key] = aliases[key].replace(devKey, devAliases[devKey]))
  );

  return aliases;
}

module.exports = (api) => {
  api.cache(true);

  let aliases = {};

  if (process.env.BABEL_ENV === 'development') {
    aliases = prepareAliasesMapForDevelopment(aliases);
  } else {
    aliases = prepareAliasesMap(aliases);
  }

  return {
    presets: [
      "@babel/preset-react",
    ],
    plugins: [
      [ "module-resolver", {
        loglevel: 'silent',
        alias: aliases,
      }]
    ]
  };
}