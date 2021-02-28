import React from 'react';
import styled from 'styled-components';

import { colors } from 'websight-admin/theme';

const AccordionWrapper = styled.div`
    max-width: 450px;
    transition: max-height .2s ease-in-out;
`;

const Trigger = styled.div`
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    padding: 4px 0;
    border-bottom: 1px solid ${colors.veryLightGrey};
`;

const ContentWrapper = styled.div`
    padding-left: 10px;
`;

const ToggleIcon = styled.i`
    font-size: 18px;
`;

export default class Accordion extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            isOpen: false
        }
        this.open = this.open.bind(this);
        this.close = this.close.bind(this);
    }

    open() {
        this.setState({ isOpen: true });
    }

    close() {
        this.setState({ isOpen: false });
    }

    render() {
        const { children, title } = this.props;
        const { isOpen } = this.state;

        return (
            <AccordionWrapper>
                <Trigger onClick={() => isOpen ? this.close() : this.open()}>
                    {title}
                    <ToggleIcon className='material-icons'>
                        {isOpen ? 'expand_less' : 'expand_more'}
                    </ToggleIcon>
                </Trigger>
                {isOpen && (
                    <ContentWrapper>
                        {children}
                    </ContentWrapper>
                )}
            </AccordionWrapper>
        )
    }
}