import { configDocs } from './lib/config';
import { writeFile } from 'fs/promises';

function formatJson(data)
{
	return `\`${data.replace(/\n/g, '')}\``;
}

let data = `# Edumeet Server Configuration

| Property | Description | Format | Default value |
| :------- | :---------- | :----- | :------------ |
`;

Object.entries(configDocs).forEach((entry: [string, any]) =>
{
	const [ name, value ] = entry;

	data += `| ${name} | ${value.doc} | ${formatJson(value.format)} | \`${formatJson(value.default)}\` |\n`;
});

data += `

---

*Document generated with:* \`yarn gen-config-docs\`
`;

writeFile('README.md', data).then(() =>
{
	console.log('done'); // eslint-disable-line
}, (err) =>
{
	console.error(`Error writing file: ${err.message}`); // eslint-disable-line
});
