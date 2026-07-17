package com.keeper.util;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import javax.money.CurrencyUnit;
import javax.money.Monetary;

@Converter(autoApply = true)
public class CurrencyUnitConverter implements AttributeConverter<CurrencyUnit, String> {

    @Override
    public String convertToDatabaseColumn(CurrencyUnit attribute) {
        return attribute == null ? null : attribute.getCurrencyCode();
    }

    @Override
    public CurrencyUnit convertToEntityAttribute(String dbData) {
        return dbData == null ? null : Monetary.getCurrency(dbData);
    }
}
