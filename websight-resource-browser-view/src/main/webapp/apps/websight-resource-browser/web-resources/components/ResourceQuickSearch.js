import React from 'react';
import TextField from '@atlaskit/textfield';
import Tooltip from '@atlaskit/tooltip';
import styled from 'styled-components';

import { ClearButton } from 'websight-admin/Buttons';
import { colors } from 'websight-admin/theme';
import { debounce } from 'websight-admin/Utils';
import { LoadingWrapper } from 'websight-admin/Wrappers';
import { ResourceIcon } from 'websight-admin/Icons';

import ResourceService from '../services/ResourceService.js';
import ResourceProviderDotMarkerContainer from '../utils/ResourceProviderDotMarkerContainer.js'

const ARROW_UP_KEY = 'ArrowUp';
const ARROW_DOWN_KEY = 'ArrowDown';
const ENTER_KEY = 'Enter';
const QUICK_SEARCH_SELECTED_ROW_CLASS = 'quick-search-selected';

const SearchContainer = styled.div`
    margin-top: 10px;
    width: 100%;
`;

const SearchFieldContainer = styled.div`
    display: flex;
    align-items: center;
    margin-bottom: 10px;
    && > div {
        max-width: 600px;
        border-width: 1px;
    }
`;

const SearchResultsContainer = styled.div`
    width: 100%;
    height: calc(100% - 52px);
    overflow-y: auto;
    border: 1px solid ${colors.mediumLightGrey};
    border-radius: 3px;

    &:focus {
        outline: none;
    }
`;

const SearchResultRowContainer = styled.div`
    align-items: center;
    border-bottom: 1px solid ${colors.mediumLightGrey};
    cursor: pointer;
    display: flex;
    font-size: 12px;
    padding: 6px;
    word-break: break-all;

    span {
        color: ${colors.primaryBlue};
    }

    mark {
        background: unset;
        color: unset;
        font-weight: bold;
    }

    .chevron {
        visibility: hidden;
    }

    &.${QUICK_SEARCH_SELECTED_ROW_CLASS} {
        background: ${colors.veryLightGrey};

        .chevron {
            visibility: visible;
        }
    }
`;

const NoResultsContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    height: calc(100% - 52px);
    font-size: 12px;
`;

const LaunchIcon = styled.i`
    font-size: 14px;
    padding: 5px 5px 5px 10px;
    color: ${colors.darkGrey};
`;

const WarningIcon = styled.i`
    font-size: 14px;
    color: ${colors.orange};
    margin: 4px 12px;
`;

export default class ResourceQuickSearch extends React.Component {
    constructor(props) {
        super(props);

        this.requestResourceSearch = this.requestResourceSearch.bind(this);
        this.resourcePathRender = this.resourcePathRender.bind(this);
        this.foundResourceRender = this.foundResourceRender.bind(this);
        this.scrollToResourceRow = this.scrollToResourceRow.bind(this);
        this.setQuickSearchProps = this.setQuickSearchProps.bind(this);
        this.noResultsRender = this.noResultsRender.bind(this);
    }

    componentDidUpdate(prevProps) {
        const { selectedProviders, quickSearch } = this.props;
        if (prevProps.selectedProviders.length !== selectedProviders.length) {
            this.onFieldChange(quickSearch.searchValue);
        }
    }

    setQuickSearchProps(props, callback) {
        const { quickSearch } = this.props;
        this.props.onQuickSearchChange({ ...quickSearch, ...props }, callback);
    }

    requestResourceSearch(value) {
        ResourceService.findResources(value, this.props.selectedProviders, (resources, data) => {
            this.setQuickSearchProps({
                foundResources: resources,
                warnings: Object.values(data).map(provider => provider.warning),
                selectedResourceIndex: 0,
                isLoading: false
            })
        }, () => this.setQuickSearchProps({ foundResources: [], isLoading: false }));
    }

    openResource(index = this.props.quickSearch.selectedResourceIndex) {
        const { foundResources } = this.props.quickSearch;
        const { path, providers } = foundResources[index];

        if (!isNaN(index)) {
            this.setQuickSearchProps({ selectedResourceIndex: index });
        }

        this.props.openResourcesForPath(path, providers[0].value);
    }

    scrollToResourceRow() {
        const el = document.querySelector(`.${QUICK_SEARCH_SELECTED_ROW_CLASS}`);
        el && el.scrollIntoView({ block: 'end' });
    }

    onFieldChange(value) {
        this.setQuickSearchProps({ searchValue: value, isLoading: true });
        this.debounceTimerId = debounce(() => this.requestResourceSearch(value), this.debounceTimerId);
    }

    onFieldKeyDown(key, event) {
        const { selectedResourceIndex, foundResources } = this.props.quickSearch
        switch(key) {
        case ARROW_DOWN_KEY:
            event.preventDefault();
            if (selectedResourceIndex === foundResources.length - 1) {
                this.setQuickSearchProps({ selectedResourceIndex: 0 }, this.scrollToResourceRow);
            } else {
                this.setQuickSearchProps({ selectedResourceIndex: selectedResourceIndex + 1 }, this.scrollToResourceRow);
            }
            break;
        case ARROW_UP_KEY:
            event.preventDefault();
            if (selectedResourceIndex === 0) {
                this.setQuickSearchProps({ selectedResourceIndex: foundResources.length - 1 }, this.scrollToResourceRow);
            } else {
                this.setQuickSearchProps({ selectedResourceIndex: selectedResourceIndex - 1 }, this.scrollToResourceRow);
            }
            break;
        default:
            break;
        }
    }

    onFieldKeyUp(key) {
        switch(key) {
        case ENTER_KEY:
            this.openResource();
            break;
        default:
            break;
        }
    }

    resourcePathRender(path) {
        const { searchValue } = this.props.quickSearch;
        const terms = searchValue
            .split(/[/, ]+/)
            .filter(term => term);

        let startIndex = 0;
        const highlightDetails = [];
        terms.forEach(term => {
            const termBegin = startIndex + path.substring(startIndex).indexOf(term);
            if (termBegin >= startIndex) {
                const termEnd = termBegin + term.length;
                highlightDetails.push({ begin: startIndex, end: termBegin, highlight: false })
                startIndex = termEnd;
                highlightDetails.push({ begin: termBegin, end: termEnd, highlight: true });
            }
        })
        highlightDetails.push({ begin: startIndex, end: path.length, highlight: false });

        return (
            <span>
                {
                    terms.length
                        ? highlightDetails.map(({ begin, end, highlight }) => {
                            const part = path.substring(begin, end);
                            return highlight ? <mark key={begin}>{part}</mark> : <span key={begin}>{part}</span>;
                        })
                        : path
                }
            </span>
        )
    }

    foundResourceRender(resource, index) {
        const { onOpenResourcesEditor } = this.props;
        const { selectedResourceIndex } = this.props.quickSearch;

        return (
            <SearchResultRowContainer
                className={index === selectedResourceIndex ? QUICK_SEARCH_SELECTED_ROW_CLASS : ''}
                onClick={() => this.openResource(index)}
            >
                <i className='material-icons-outlined chevron'>chevron_right</i>
                <ResourceIcon isFolder={resource.hasChildren}/>
                {this.resourcePathRender(resource.path)}
                {resource.providers.map(provider => (
                    <ResourceProviderDotMarkerContainer key={provider.value} style={{ background: provider.color }}>
                        {provider.label}
                    </ResourceProviderDotMarkerContainer>
                ))}
                {resource.hasContent &&
                    <Tooltip content='Open in editor'>
                        <LaunchIcon
                            className='material-icons-outlined'
                            onClick={(event) => {
                                onOpenResourcesEditor(resource);
                                event.stopPropagation();
                            }}
                        >
                            launch
                        </LaunchIcon>
                    </Tooltip>
                }
            </SearchResultRowContainer>
        )
    }

    noResultsRender() {
        const { searchValue } = this.props.quickSearch;
        return (
            <>
                {searchValue && (
                    <NoResultsContainer>
                        No results found for &apos;{searchValue}&apos;
                    </NoResultsContainer>
                )}
            </>
        )
    }

    warningMessagesRender(warnings) {
        if (warnings && warnings.length) {
            return (
                <>
                    {
                        warnings.map((warningMessage, index) =>
                            <Tooltip key={index} content={warningMessage} delay={0}>
                                <WarningIcon className='material-icons'>warning</WarningIcon>
                            </Tooltip>
                        )
                    }
                </>
            )
        }
    }

    render() {
        const { searchValue, foundResources, isLoading, warnings } = this.props.quickSearch;

        const keyEventHandlers = {
            onKeyUp: (event) => this.onFieldKeyUp(event.key),
            onKeyDown: (event) => this.onFieldKeyDown(event.key, event)
        }

        return (
            <SearchContainer>
                <SearchFieldContainer>
                    <TextField
                        isCompact
                        placeholder="Start typing to find resources"
                        autocomplete='off'
                        {...keyEventHandlers}
                        onChange={event => this.onFieldChange(event.target.value)}
                        elemAfterInput={(
                            <ClearButton
                                onClick={() =>
                                    this.setQuickSearchProps({ searchValue: '', foundResources: [] })
                                }
                                isVisible={searchValue}
                            />
                        )}
                        value={searchValue}
                    />
                    {this.warningMessagesRender(warnings)}
                </SearchFieldContainer>
                <SearchResultsContainer className="results" {...keyEventHandlers} tabIndex={0}>
                    <LoadingWrapper isLoading={isLoading} spinnerStyle={{ top: '15vh', bottom: 'auto' }} showSpinner={true}>
                        {foundResources.map(this.foundResourceRender)}
                    </LoadingWrapper>
                    {!foundResources.length && !isLoading && this.noResultsRender()}
                </SearchResultsContainer>
            </SearchContainer>
        )
    }
}
