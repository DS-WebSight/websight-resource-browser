import styled from 'styled-components';

export default styled.div`
    --default-height: 30px;

    align-items: flex-start;
    display: flex;
    justify-content: space-between;
    height: var(--default-height);

    &:not(.new-property-type) {
        width: calc(100% - 20px);
    }

    form {
        height: var(--default-height);
        width: 100%;
    }

    &:not(.new-property-type) > form {
        width: calc(100% - 48px);
    }


    form > div:first-child {
        margin: 0;
    }

    div, span {
        border-width: 0px;
    }

    .inline-editfield,
    .inline-editfield div,
    button + div span {
        line-height: var(--default-height);
        padding: 0;
        margin: 0;
        min-height: var(--default-height);
    }

    .inline-editfield {
        height: var(--default-height);
        max-height: var(--default-height);
    }

    input + div,
    .modifiable {
        height: var(--default-height);
        min-height: var(--default-height);
    }

    input + div > div {
        min-height: var(--default-height);
    } ${'' /* Covers date picker results field */}

    input + div > div > div {
        padding-left: 0;
    } ${'' /* Covers date picker results field */}

    form div[id^='react-select'] {
        cursor: pointer;
        padding: 2px 5px;
    }

    input[placeholder='Browse File'] {
        padding-left: 0;

        & + button {
            min-height: 24px;
            height: 24px;
            padding: 1px 5px;

            span {
                line-height: auto;
                min-height: auto;
                height: auto;
            }
        }
    }
`;