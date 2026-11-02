package com.keeper.market;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class AlphaSymbolTest {

  @Test
  void yahooStyleIndianSymbolsBecomeBseSymbols() {
    assertEquals("TCS.BSE", AlphaVantageProvider.providerSymbol("tcs.ns"));
    assertEquals("RELIANCE.BSE", AlphaVantageProvider.providerSymbol("RELIANCE.BO"));
    assertEquals("AAPL", AlphaVantageProvider.providerSymbol("AAPL"));
  }

  @Test
  void theCurrencyFollowsTheListing() {
    assertEquals("INR", AlphaVantageProvider.currencyOf("TCS.BSE"));
    assertEquals("GBP", AlphaVantageProvider.currencyOf("VOD.LON"));
    assertEquals("USD", AlphaVantageProvider.currencyOf("AAPL"));
  }
}
