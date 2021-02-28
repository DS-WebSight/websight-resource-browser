import React from 'react';
import styled from 'styled-components';

import PathAutosuggestion from 'websight-autosuggestion-esm/PathAutosuggestion';
import { colors } from 'websight-admin/theme';

import ResourceProviderDotMarkerContainer from '../utils/ResourceProviderDotMarkerContainer.js'

const AutosuggestionContainer = styled.div`
    display: flex;
    width: 100%;
`;

const OptionLabelContainer = styled.div`
    display: flex;
    align-items: center;
    overflow: hidden;
`;

export default class ResourceHeader extends React.Component {
    constructor(props) {
        super(props);

        this.optionPostProcessor = this.optionPostProcessor.bind(this);
    }

    optionPostProcessor(option) {
        const { providers } = this.props;

        const removeBeginningSlashFromString = (value) =>
            value[0] === '/' ? value.slice(1) : value

        if (option.isDisabled) return { label: option.value, ...option };

        const optionHasProviders = option.data && option.data.providers && option.data.providers.length;
        const optionProviders = optionHasProviders ? option.data.providers : ['synthetic.resource'];
        const providerMarkerColor = (provider) => {
            if (optionHasProviders) {
                return providers.find(({ value }) => value === provider).color;
            } else {
                return colors.grey;
            }
        };
        const providerLabel = (provider) => {
            if (optionHasProviders) {
                return providers.find(({ value }) => value === provider).label;
            } else {
                return 'Synthetic Resource';
            }
        }

        const newOptionValue = removeBeginningSlashFromString(option.value);

        return {
            ...option,
            value: newOptionValue,
            label: (
                <OptionLabelContainer>
                    { newOptionValue }
                    { optionProviders.map(provider => {
                        const color = providerMarkerColor(provider);

                        return (
                            <ResourceProviderDotMarkerContainer key={`${option.value}${provider}`} style={{ background: color }}>
                                {providerLabel(provider)}
                            </ResourceProviderDotMarkerContainer>
                        )
                    }) }
                </OptionLabelContainer>
            )
        }
    }

    render() {
        const { providers, resource, openResourcesForPath } = this.props;

        return (
            <AutosuggestionContainer>
                <PathAutosuggestion
                    noOptionsMessage={(inputValue) => `No resource found for "${inputValue}"`}
                    onChange={(resourcePath) => {
                        openResourcesForPath(resourcePath);
                    }}
                    optionPostProcessor={this.optionPostProcessor}
                    parameters={{ autosuggestionType: 'resource-browser', providers: providers.map(({ value }) => value) }}
                    placeholder='Choose a resource path'
                    styles={{
                        backgroundColor: colors.white
                    }}
                    value={resource.path}
                />
            </AutosuggestionContainer>
        )
    }
}