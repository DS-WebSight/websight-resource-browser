import { colors } from 'websight-admin/theme';

import { RESOURCE_BROWSER_ROOT_PATH } from '../../../../utils/ResourceBrowserConstants.js';

const NavigationItemFragment = {
    title: 'Resource Browser',
    img: 'account_tree',
    color: colors.orange,
    description: 'Browse and manage Sling resources from multiple resource providers. Take control over your content.',
    href: RESOURCE_BROWSER_ROOT_PATH
}

export default NavigationItemFragment;