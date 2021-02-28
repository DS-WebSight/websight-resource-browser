import React from 'react';
import Badge from '@atlaskit/badge';
import Popup from '@atlaskit/popup';
import Tooltip from '@atlaskit/tooltip';
import styled from 'styled-components';

import { colors } from 'websight-admin/theme';

import Accordion from './Accordion.js';
import ChangelogReadService from '../services/ChangelogReadService.js';
import { PROPERTY_TYPE, SAVE_OPERATIONS } from '../utils/ResourceBrowserConstants.js';

const PopupContainer = styled.div`
    align-items: center
    display: flex;
    height: 100%;
    margin-right: 4px;
`;

const InfoIcon = styled.i`
    color: ${colors.lightGrey};
    cursor: pointer;
    display: flex;
    font-size: 26px;
`;

const ContentWrapper = styled.div`
    font-size: 12px;
    max-height: 75vh;
    max-height: 75vh;
    max-width: 450px;
    min-width: 450px;
    overflow-y: auto;
    overflow-y: auto;
    padding: 30px;
`;

const FieldContainer = styled.div`
    display: flex;
    align-items: center;
    .name {
        display: inline-block;
        width: 30%;
    }
    .value {
        display: inline-block;
        width: 70%;
    }
`;

const Title = styled.h4`
    -webkit-box-align: center;
    align-items: center;
    display: flex;
    font-size: 20px;
    font-style: inherit;
    font-weight: 500;
    letter-spacing: -0.008em;
    line-height: 1;
    margin: 0px;
    min-width: 0px;
    margin-bottom: 22px;
`;

const ChangeAmountWrapper = styled.div`
    position: absolute;
    top: -7px;
    right: -3px;
    cursor: pointer;
    span {
        font-size: 12px;
    }
`;

const InlineBadgeWrapper = styled.div`
    display: inline-block;
    margin: 0 5px;
    span {
        font-size: 10px;
        font-weight: bold;
    }
`;

const AccordionTitleContainer = styled.div`
    display: flex;
    width: 100%;
    justify-content: space-between;
`;

export default class ChangelogPopup extends React.Component {
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

    changelogRender(changelog) {
        const isEmpty = ChangelogReadService.isEmpty(changelog);

        return (
            <>
                {isEmpty ? <span>No changes to save.</span>
                    : Object.keys(changelog).map(path => this.changelogPathRender(changelog[path], path))}
            </>
        )
    }

    changelogPathRender(changelog, path) {
        const changeAmount = this.countChangesPath(changelog);

        return (
            <>
                {changeAmount > 0 && (
                    <Accordion title={(
                        <AccordionTitleContainer>
                            <strong>{path}</strong>
                            <InlineBadgeWrapper>
                                <Badge className='inline-bade'>{changeAmount}</Badge>
                            </InlineBadgeWrapper>
                        </AccordionTitleContainer>
                    )}>
                        {changelog.map(variantChangelog => this.changelogVariantRender(variantChangelog))}
                    </Accordion>
                )}
            </>
        )
    }

    changelogVariantRender(changelog) {
        const changeAmount = this.countChangesVariant(changelog);

        return (
            <>
                {changeAmount > 0 && (
                    <Accordion title={(
                        <AccordionTitleContainer>
                            <span>{changelog.provider}</span>
                            <InlineBadgeWrapper>
                                <Badge className='inline-bade'>{changeAmount}</Badge>
                            </InlineBadgeWrapper>
                        </AccordionTitleContainer>
                    )}>
                        {Object.values(SAVE_OPERATIONS)
                            .filter(operation => changelog[operation])
                            .map(operation => this.changelogVariantOperationRender(changelog[operation], operation))}
                    </Accordion>
                )}
            </>
        )
    }

    changelogVariantOperationRender(operation, name) {
        const operationRender = (operationToRender) => {
            return (
                <>
                    {
                        Array.isArray(operationToRender)
                            ? operationToRender.map((entry, index) => operationEntryRender(entry, index))
                            : operationEntryRender(operationToRender)
                    }
                </>
            )
        }

        const operationEntryRender = (entry, title) => {
            if (typeof entry === 'object') {
                const fields = (
                    <>
                        {Object.keys(entry)
                            .filter(fieldName => entry.type !== PROPERTY_TYPE.BINARY || fieldName !== 'value')
                            .map((fieldName) =>
                                operationFieldRender(fieldName, operationRender(entry[fieldName])))}
                    </>
                )
                return (
                    <>
                        {title !== undefined ? (
                            <Accordion title={<span>{title}</span>}>{fields}</Accordion>
                        ) : fields}
                    </>
                )
            }
            return <span>{operationFieldRender(entry)}</span>
        }
        
        const operationFieldRender = (fieldName, fieldValue) => {
            return (
                <FieldContainer key={fieldName}>
                    <span className='name'>{fieldName}</span>
                    <span className='value'>{fieldValue}</span>
                </FieldContainer>
            )
        }

        const changeAmount = this.countChangesOperation(operation);

        return (
            <>
                {changeAmount > 0 && (
                    <Accordion title={(
                        <AccordionTitleContainer>
                            <span>{name}</span>
                            <InlineBadgeWrapper>
                                <Badge className='inline-bade'>{changeAmount}</Badge>
                            </InlineBadgeWrapper>
                        </AccordionTitleContainer>
                    )}>
                        {operationRender(operation)}
                    </Accordion>
                )}
            </>
        )
    }

    countChangesOperation(changelog) {
        let result = 0;
        if (Array.isArray(changelog)) {
            changelog
                .forEach(entry => {
                    result++;
                    if (entry.children && Array.isArray(entry.children)) {
                        result += this.countChangesOperation(entry.children);
                    }
                })
        } else {
            result = 1;
        }
        return result;
    }

    countChangesVariant(changelog) {
        let result = 0;
        Object.values(SAVE_OPERATIONS)
            .filter(operationName => changelog[operationName])
            .map(operationName => changelog[operationName])
            .forEach(operation => {
                result += this.countChangesOperation(operation);
            })
        return result;
    }

    countChangesPath(changelog) {
        let result = 0;
        changelog
            .forEach(variant => {
                result += this.countChangesVariant(variant);
            })
        return result;
    }

    countChangesChangelog(changelog) {
        let result = 0;
        Object.keys(changelog)
            .forEach(path => {
                result += this.countChangesPath(changelog[path]);
            })
        return result;
    }

    render() {
        const { isOpen } = this.state;
        const { changelog } = this.props;

        const changeAmount = this.countChangesChangelog(changelog);

        return (
            <PopupContainer>
                <Popup
                    isOpen={isOpen}
                    onClose={this.close}
                    shouldFlip={true}
                    content={() => (
                        <ContentWrapper>
                            <Title>Local Changes</Title>
                            {this.changelogRender(changelog)}
                        </ContentWrapper>
                    )}
                    trigger={triggerProps => (
                        <div {...triggerProps} style={{ position: 'relative' }} onClick={this.open}>
                            {changeAmount > 0 && (
                                <ChangeAmountWrapper>
                                    <Badge appearance='important'>{changeAmount}</Badge>
                                </ChangeAmountWrapper>
                            )}
                            <Tooltip content='Local Changes' delay={0}>
                                <InfoIcon className='material-icons'>list_alt</InfoIcon>
                            </Tooltip>
                        </div>
                    )}
                />
            </PopupContainer>
        )
    }
}