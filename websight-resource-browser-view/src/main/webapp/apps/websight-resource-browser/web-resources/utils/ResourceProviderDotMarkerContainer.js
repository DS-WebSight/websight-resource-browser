import styled from 'styled-components';

import { colors } from 'websight-admin/theme';

export default styled.div`
    --transition-animation: cubic-bezier(.42,0,1,1);

    display: inline-block;
    border-radius: 50px;
    font-size: 0px;
    color: ${colors.white}
    min-height: 7px;
    min-width: 7px;
    max-height: 7px;
    max-width: 7px;
    overflow: hidden;
    padding: 0;
    transition:
        max-width .1s var(--transition-animation),
        max-height .1s var(--transition-animation),
        width .1s var(--transition-animation),
        height .1s var(--transition-animation),
        padding .1s var(--transition-animation);
    margin-left: 6px;
    white-space: nowrap;

    &:hover {
        font-size: 11px;
        width: auto;
        height: auto;
        max-height: 200px;
        max-width: 200px;
        padding: 0 6px 1px 8px;
        z-index: 999;
        transition:
            max-width .3s var(--transition-animation),
            max-height .3s var(--transition-animation),
            width .3s var(--transition-animation),
            height .3s var(--transition-animation),
            padding .3s var(--transition-animation);
    }
`;