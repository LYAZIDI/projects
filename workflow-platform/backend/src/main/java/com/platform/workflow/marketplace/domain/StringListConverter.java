package com.platform.workflow.marketplace.domain;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

/**
 * JPA converter for Postgres TEXT[] arrays stored as a comma-separated string.
 *
 * <p>For a production setup with a custom Hibernate dialect you would map
 * the native array type directly. This simple converter avoids that dependency.
 */
@Converter
public class StringListConverter implements AttributeConverter<List<String>, String> {

    private static final String SEPARATOR = ",";

    @Override
    public String convertToDatabaseColumn(List<String> list) {
        if (list == null || list.isEmpty()) return "";
        return String.join(SEPARATOR, list);
    }

    @Override
    public List<String> convertToEntityAttribute(String dbValue) {
        if (dbValue == null || dbValue.isBlank()) return Collections.emptyList();
        return Arrays.asList(dbValue.split(SEPARATOR));
    }
}
