import React, { FC, useCallback, useContext } from 'react';
import styled from 'styled-components';

import { Trans, translateRaw } from '@translations';
import {
  isValidETHAddress,
  GetTxResponse,
  GetBalanceResponse,
  GetTokenTxResponse
} from '@services';
import { BREAK_POINTS, COLORS, FONT_SIZE, LINE_HEIGHT, SPACING } from '@theme';
import ProtectIconCheck from '@components/icons/ProtectIconCheck';
import WizardIcon from '@components/icons/WizardIcon';
import CloseIcon from '@components/icons/CloseIcon';
import { ETHAddressExplorer } from '@config';
import { EthAddress, LinkOut, VerticalStepper, PoweredByText } from '@components';
import { StepData } from '@components/VerticalStepper';
import { truncate, useScreenSize } from '@utils';

import ProtectTxBase from './ProtectTxBase';
import { ProtectTxContext } from '../ProtectTxProvider';
import { ProtectTxUtils } from '../utils';
import { NansenReportType } from '../types';
import { NansenServiceEntry } from '@services/ApiService/Nansen';
import { Asset } from '@types';

const Wrapper = styled(ProtectTxBase)`
  .title-address {
    margin: 0 0 ${SPACING.SM};
  }

  .timeline {
    text-align: left;
    padding: 0 20px;
  }

  .view-comments {
    position: relative;
    font-size: ${FONT_SIZE.BASE};
    line-height: ${LINE_HEIGHT.XL};
    margin: 0 50px 30px 80px;
    color: ${COLORS.PURPLE};
    text-align: left;

    > svg {
      position: absolute;
      left: -75px;
      bottom: -50px;
      transform: translateY(-50%);
      max-width: 61px;
      max-height: 54px;
    }

    @media (min-width: ${BREAK_POINTS.SCREEN_LG}) {
      > svg {
        right: -200px;
        left: unset;
        bottom: unset;
        max-width: 186px;
        max-height: 169px;
      }
    }
  }

  .footer-text {
    font-size: ${FONT_SIZE.BASE};
    line-height: ${LINE_HEIGHT.XL};

    .highlighted {
      color: ${COLORS.PURPLE};
    }
  }
`;

const StepperDescText = styled.p`
  margin: 0;

  &.text-success {
    color: ${COLORS.SUCCESS_GREEN};
  }

  &.text-no-info {
    color: ${COLORS.PURPLE};
  }

  &.text-danger {
    color: ${COLORS.WARNING_ORANGE};
  }

  &.text-error {
    color: ${COLORS.ERROR_RED_LIGHT};
  }

  &.text-muted {
    color: ${COLORS.BLUE_GREY};
  }
`;

const SEthAddress = styled.div`
  &&& button {
    margin: 0;
    font-family: 'Lato', sans-serif;
    font-size: ${FONT_SIZE.XL};
    font-weight: 700;
    line-height: ${LINE_HEIGHT.XXL};
  }
`;

export const ProtectTxReport: FC = () => {
  const protectTxContext = useContext(ProtectTxContext);
  const getProTxValue = ProtectTxUtils.isProtectTxDefined(protectTxContext);
  if (!getProTxValue()) {
    throw new Error('ProtectTxProtection requires to be wrapped in ProtectTxContext!');
  }

  const {
    state: {
      etherscanBalanceReport,
      etherscanLastTxReport,
      etherscanLastTokenTxReport,
      nansenAddressReport,
      asset,
      receiverAddress,
      isWeb3Wallet
    },
    showHideProtectTx
  } = protectTxContext;

  const { isSmScreen } = useScreenSize();

  const onHideModel = useCallback(
    (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
      e.preventDefault();

      if (showHideProtectTx) {
        showHideProtectTx(false);
      }
    },
    [showHideProtectTx]
  );

  const steps = getTimelineSteps(
    nansenAddressReport,
    etherscanLastTxReport,
    etherscanLastTokenTxReport,
    etherscanBalanceReport,
    asset,
    receiverAddress
  );

  return (
    <Wrapper>
      {!isSmScreen && <CloseIcon size="lg" onClick={onHideModel} />}
      <ProtectIconCheck size="lg" />
      <h4>{translateRaw('PROTECTED_TX_REPORT_TITLE')}</h4>
      {receiverAddress && isValidETHAddress(receiverAddress) && (
        <SEthAddress>
          <EthAddress address={receiverAddress} truncate={truncate} isCopyable={false} />
        </SEthAddress>
      )}
      {nansenAddressReport && (
        <h5 className="subtitle">{translateRaw('PROTECTED_TX_REPORT_SUBTITLE')}</h5>
      )}
      <div className="timeline">
        {nansenAddressReport ? (
          <VerticalStepper currentStep={-1} size="lg" color={COLORS.PURPLE} steps={steps} />
        ) : (
          <div className="loading" />
        )}
      </div>
      {nansenAddressReport && receiverAddress && (
        <>
          <p className="view-comments">
            <Trans
              id="PROTECTED_TX_ETHERSCAN_EXTERNAL_LINK"
              variables={{
                $etherscanLink: () => (
                  <LinkOut
                    showIcon={false}
                    inline={true}
                    fontSize={FONT_SIZE.BASE}
                    fontColor={COLORS.PURPLE}
                    underline={true}
                    link={`${ETHAddressExplorer(receiverAddress)}`}
                    text="Etherscan"
                  />
                )
              }}
            />
            <WizardIcon size="lg" />
          </p>
          <p className="footer-text">
            {translateRaw('PROTECTED_TX_REPORT_FOOTER_TEXT')}
            {!isWeb3Wallet && (
              <Trans
                id="PROTECTED_TX_REPORT_FOOTER_TEXT_NOT_WEB3_WALLET"
                variables={{
                  $20seconds: () => (
                    <span className="highlighted">
                      {translateRaw('PROTECTED_TX_REPORT_20_SEC')}
                    </span>
                  )
                }}
              />
            )}
          </p>
        </>
      )}
      <PoweredByText provider="NANSEN" />
    </Wrapper>
  );
};

const getAccountBalanceTimelineEntry = (
  etherscanBalanceReport: GetBalanceResponse | null,
  asset: Asset | null
): StepData => {
  const balance = ProtectTxUtils.getBalance(etherscanBalanceReport);
  const assetTicker = asset && asset.ticker;

  return {
    title: translateRaw('PROTECTED_TX_RECIPIENT_ACCOUNT_BALANCE'),
    content: (
      <StepperDescText className="text-muted">
        {balance ? (
          <>
            {balance} {assetTicker}
          </>
        ) : (
          translateRaw('PROTECTED_TX_UNKNOWN_BALANCE')
        )}
      </StepperDescText>
    )
  };
};

const getLastTxReportTimelineEntry = (
  etherscanLastTxReport: GetTxResponse | null,
  etherscanLastTokenTxReport: GetTokenTxResponse | null,
  receiverAddress: string | null
): StepData => {
  const lastSentTx = ProtectTxUtils.getLastTx(
    etherscanLastTxReport,
    etherscanLastTokenTxReport,
    receiverAddress
  );

  return {
    title: (
      <>
        {translateRaw('PROTECTED_TX_RECIPIENT_ACCOUNT_ACTIVITY')}
        <br />
        {translateRaw('PROTECTED_TX_LAST_SENT_TX')}
      </>
    ),
    content: (
      <StepperDescText className="text-muted">
        {lastSentTx ? (
          <>
            {lastSentTx.value} {lastSentTx.ticker} on {lastSentTx.timestamp}
          </>
        ) : (
          translateRaw('PROTECTED_TX_NO_INFORMATION_AVAILABLE')
        )}
      </StepperDescText>
    )
  };
};

const getNansenStep = (nansenAddressReport: NansenServiceEntry | null) => {
  if (nansenAddressReport && nansenAddressReport.label.length > 0) {
    const { label: labels } = nansenAddressReport;
    const status = ProtectTxUtils.getNansenReportType(labels);
    switch (status) {
      case NansenReportType.MALICIOUS:
        return {
          title: translateRaw('PROTECTED_TX_TIMELINE_UNKNOWN_ACCOUNT'),
          content: (
            <>
              <StepperDescText className="text-error">
                {translateRaw('PROTECTED_TX_TIMELINE_MALICIOUS', {
                  $tags: `"${labels.join('", "')}"`
                })}
              </StepperDescText>
            </>
          )
        };
      case NansenReportType.WHITELISTED:
        return {
          title: translateRaw('PROTECTED_TX_TIMELINE_KNOWN_ACCOUNT'),
          content: (
            <>
              <StepperDescText className="text-success">
                {translateRaw('PROTECTED_TX_TIMELINE_TAGS', {
                  $tags: `"${labels.join('", "')}"`
                })}
              </StepperDescText>
            </>
          )
        };
      case NansenReportType.UNKNOWN:
        return {
          title: translateRaw('PROTECTED_TX_TIMELINE_UNKNOWN_ACCOUNT'),
          content: (
            <>
              <StepperDescText className="text-no-info">
                {translateRaw('PROTECTED_TX_TIMELINE_TAGS', {
                  $tags: `"${labels.join('", "')}"`
                })}
              </StepperDescText>
            </>
          )
        };
    }
  }
  // No info for account
  return {
    title: translateRaw('PROTECTED_TX_TIMELINE_UNKNOWN_ACCOUNT'),
    content: (
      <StepperDescText className="text-no-info">
        {translateRaw('PROTECTED_TX_TIMELINE_UNKNOWN_ACCOUNT_DESC')}
      </StepperDescText>
    )
  };
};

const getTimelineSteps = (
  nansenAddressReport: NansenServiceEntry | null,
  etherscanLastTxReport: GetTxResponse | null,
  etherscanLastTokenTxReport: GetTokenTxResponse | null,
  etherscanBalanceReport: GetBalanceResponse | null,
  asset: Asset | null,
  receiverAddress: string | null
) => {
  return [
    getNansenStep(nansenAddressReport),
    getAccountBalanceTimelineEntry(etherscanBalanceReport, asset),
    getLastTxReportTimelineEntry(etherscanLastTxReport, etherscanLastTokenTxReport, receiverAddress)
  ];
};
