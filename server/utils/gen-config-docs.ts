import { configDocs } from '../lib/config/config';
import { writeFile } from 'fs/promises';

function formatJson(data)
{
	return `\`${data.replace(/\n/g, '')}\``;
}

let data = `# ![edumeet logo](/app/public/images/logo.edumeet.svg) server configuration properties list:

| Name | Description | Format | Default value |
| :--- | :---------- | :----- | :------------ |
`;

Object.entries(configDocs).forEach((entry: [string, any]) =>
{
	const [ name, value ] = entry;

	// escape dynamically created default values
	switch (name)
	{
		case 'mediasoup.webRtcTransport.listenIps':
			value.default = '[ { "ip": "0.0.0.0", "announcedIp": null } ]';
			break;
		case 'mediasoup.numWorkers':
			value.default = '4';
			break;
	}

	data += `| ${name} | ${value.doc} | ${formatJson(value.format)} | \`${formatJson(value.default)}\` |\n`;
});

data += `

---

*Document generated with:* \`yarn gen-config-docs\`
`;

writeFile('config/README.md', data).then(() =>
{
	console.log('done'); // eslint-disable-line
}, (err) =>
{
	console.error(`Error writing file: ${err.message}`); // eslint-disable-line
});
