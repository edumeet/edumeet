/* eslint-disable no-console */
import domready from 'domready';
import UrlParse from 'url-parse';
import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import { getDeviceInfo } from 'mediasoup-client';
import randomString from 'random-string';
import Logger from './Logger';
import debug from 'debug';
import RoomClient from './RoomClient';
import RoomContext from './RoomContext';
import * as stateActions from './actions/stateActions';
import Room from './components/Room';
import LoadingView from './components/LoadingView';
import { MuiThemeProvider, createMuiTheme } from '@material-ui/core/styles';
import { PersistGate } from 'redux-persist/lib/integration/react';
import { persistor, store } from './store';
import { SnackbarProvider } from 'notistack';
import * as serviceWorker from './serviceWorker';
import intl from 'react-intl-universal';
import DoodExtend from './DoodExtend';
import './index.css';

if (process.env.NODE_ENV !== 'production')
{
	debug.enable('* -engine* -socket* -RIE* *WARN* *ERROR*');
}

const logger = new Logger();

let roomClient;

RoomClient.init({ store });

const theme = createMuiTheme(window.config.theme);

// locale data
const locales = {
	'en_US' : require('./locale/en_US.json'),
	'zh_CN' : require('./locale/zh_CN.json')
};

domready(() =>
{
	logger.debug('DOM ready');

	// const urlParser = new UrlParse(window.location.href, true);

	loadLocales();
	// run(urlParser);
});
function loadLocales() 
{
	const urlParser = new UrlParse(window.location.href, true);

	let locale = urlParser.query.locale;

	if (locale)
	{
		if (locale.indexOf('en') !== -1)
		{
			locale = 'en_US';
		}
		else if (locale.indexOf('zh') !== -1)
		{
			locale = 'zh_CN';
		}
	}
	else
	{
		locale = 'zh_CN';
	}
	logger.debug('run() loadLocales', locale);
	intl.init({
		currentLocale : locale, // TODO: determine locale here
		locales
	})
		.then(() => 
		{
			run(urlParser);
		});
}
function run(urlParser)
{
	console.log('run() ', urlParser);
	logger.debug('run() [environment:%s]', process.env.NODE_ENV);
	let peerName = urlParser.query.userID; // String(utils1.randomNumber());
	const userId = urlParser.query.userID;
	const groupId = urlParser.query.groupId;

	let roomId = urlParser.query.roomId; 
	// urlParser.pathname.substr(1) ? urlParser.pathname.substr(1) : urlParser.query.roomId;
	const init = urlParser.query.init; // 是否是初始化
	const mode = urlParser.query.mode; // 类型
	const adminId = urlParser.query.adminId; // 管理员
	const title = urlParser.query.title; // 标题 会议主题
	const desc = urlParser.query.desc; // 备注 
	const members = urlParser.query.members || '[]';
	const serverUrl = urlParser.query.serverUrl;
	const serverPort = urlParser.query.serverPort;
	const produce = urlParser.query.produce !== 'false';

	const displayName = urlParser.query.displayName;
	const isSipEndpoint = urlParser.query.sipEndpoint === 'true';
	const useSimulcast = true; // urlParser.query.simulcast === 'true';
	const startTime = urlParser.query.startTime || new Date().getTime();
	const stopTime = urlParser.query.stopTime;
	const version = urlParser.query.version;
	const platform = urlParser.query.platform;

	console.log('run() startTime>> ', startTime, members, typeof startTime);

	const memberIds = JSON.parse(members);
	const extend = {
		roomId,
		displayName,
		serverUrl,
		serverPort,
		version,
		platform,
		init,
		mode,
		adminId,
		title,
		desc,
		startTime,
		stopTime,
		groupId,
		members : memberIds
	};

	if (!peerName)
	{
		peerName = randomString({ length: 8 }).toLowerCase();
	}
	if (!roomId)
	{
		roomId = randomString({ length: 8 }).toLowerCase();

		urlParser.query.roomId = roomId;
		window.history.pushState('', '', urlParser.toString());
	}

	// Get the effective/shareable Room URL.
	const roomUrlParser = new UrlParse(window.location.href, true);

	for (const key of Object.keys(roomUrlParser.query))
	{
		// Don't keep some custom params.
		switch (key)
		{
			case 'roomId':
			case 'simulcast':
				break;
			default:
				delete roomUrlParser.query[key];
		}
	}
	delete roomUrlParser.hash;

	const roomUrl = roomUrlParser.toString();

	// Get current device.
	const device = getDeviceInfo();

	store.dispatch(
		stateActions.setRoomUrl(roomUrl));

	const _doodExtend = DoodExtend.create(device);

	// 调用豆豆接口获取 群成员信息
	if (groupId)
	{
		_doodExtend.getMemberList({ groupId }).then((array) => 
		{
			if (array)
			{
				store.dispatch(
					stateActions.setMemberList(array));
				store.dispatch(
					stateActions.setMemberIdList(memberIds));
	
				memberIds.forEach((id) =>
				{
					if (id != userId) // 兼容字符串和 整型判断
					{
						array.forEach((member) =>
						{
							if (member[0] == id) 
							{
								const { thumbAvatar, remark, name } = member[1];
		
								const showName = remark ? remark : name;
								const picture = thumbAvatar;

								store.dispatch(
									stateActions.addPeer({
										name        : id,
										displayName : showName,
										extends     : {
											join : false
										},
										raiseHandState : false,
										device         : device,
										consumers      : []
									}));
								store.dispatch(
									stateActions.setPeerPicture(id, picture));
							}
						});
					}
	
				});
			}
		});
	}	

	store.dispatch(
		stateActions.setMe({
			peerName,
			device,
			loginEnabled : window.config.loginEnabled,
			extend
		})
	);

	roomClient = new RoomClient(
		{ roomId, peerName, device, useSimulcast, produce, extend });

	global.CLIENT = roomClient;

	render(
		<Provider store={store}>
			<MuiThemeProvider theme={theme}>
				<PersistGate loading={<LoadingView />} persistor={persistor}>
					<RoomContext.Provider value={roomClient}>
						<SnackbarProvider>
							<Room />
						</SnackbarProvider>
					</RoomContext.Provider>
				</PersistGate>
			</MuiThemeProvider>
		</Provider>,
		document.getElementById('multiparty-meeting')
	);
}

serviceWorker.unregister();
