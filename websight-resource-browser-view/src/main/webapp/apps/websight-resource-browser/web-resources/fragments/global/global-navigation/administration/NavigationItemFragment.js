import React from 'react';
import { LinkItem } from '@atlaskit/menu';

import { NavigationItemIcon } from 'websight-admin/Icons';

import { RESOURCE_BROWSER_ROOT_PATH } from '../../../../utils/ResourceBrowserConstants.js';

export default class NavigationItemFragment extends React.Component {
    render() {
        return (
            <LinkItem
                href={RESOURCE_BROWSER_ROOT_PATH}
                elemBefore={<NavigationItemIcon className='material-icons-outlined'>account_tree</NavigationItemIcon>}
            >
                Resource Browser
            </LinkItem>
        );
    }
}
