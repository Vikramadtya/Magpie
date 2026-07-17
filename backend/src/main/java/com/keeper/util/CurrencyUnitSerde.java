package com.keeper.util;

import io.micronaut.core.type.Argument;
import io.micronaut.serde.Decoder;
import io.micronaut.serde.Encoder;
import io.micronaut.serde.Serde;
import jakarta.inject.Singleton;
import javax.money.CurrencyUnit;
import javax.money.Monetary;
import java.io.IOException;

@Singleton
public class CurrencyUnitSerde implements Serde<CurrencyUnit> {

    @Override
    public void serialize(Encoder encoder, EncoderContext context, Argument<? extends CurrencyUnit> type, CurrencyUnit value) throws IOException {
        if (value == null) {
            encoder.encodeNull();
        } else {
            encoder.encodeString(value.getCurrencyCode());
        }
    }

    @Override
    public CurrencyUnit deserialize(Decoder decoder, DecoderContext context, Argument<? super CurrencyUnit> type) throws IOException {
        if (decoder.decodeNull()) {
            return null;
        }
        return Monetary.getCurrency(decoder.decodeString());
    }
}
