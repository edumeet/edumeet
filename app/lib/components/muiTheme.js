'use strict';

import getMuiTheme from 'material-ui/styles/getMuiTheme';
import lightBaseTheme from 'material-ui/styles/baseThemes/lightBaseTheme';
import { grey500 } from 'material-ui/styles/colors';

// NOTE: I should clone it
let theme = lightBaseTheme;

theme.palette.borderColor = grey500;

let muiTheme = getMuiTheme(lightBaseTheme);

export default muiTheme;


