import { configDocs } from './config';
import { writeFile } from 'fs/promises';

function formatJson(data)
{
	return `\`${data.replace(/\n/g, '')}\``;
}

let data = `# Edumeet Server Configuration

The server configuration file can use one of the following formats:

- config/config.json
- config/config.json5
- config/config.yaml
- config/config.yml
- config/config.toml

Example \`config.yaml\`:

\`\`\`yaml
redisOptions:
  host: redis
  port: 6379

listeningPort: 3443
\`\`\`

Additionally, a \`config/config.js\` can be used to override specific properties
with runtime generated values and to set additional configuration functions and classes.
Look at the default \`config/config.example.js\` file for documentation.

## Configuration properties

| Name | Description | Format | Default value |
| :--- | :---------- | :----- | :------------ |
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
