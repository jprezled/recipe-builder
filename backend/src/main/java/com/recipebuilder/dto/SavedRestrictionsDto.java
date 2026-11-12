//The same two strings the address carries, so a saved preference and a filter typed into a link are the same shape and cannot disagree.

package com.recipebuilder.dto;

/**
 * RB-209: the dietary choices a cook has saved to their account.
 *
 * The same two strings the web address carries, so a saved preference and a
 * filter typed into the address are the same shape and cannot disagree. See
 * docs/dietary-filter-contract.md for the agreed values.
 *
 * Empty string means "nothing saved". That is NOT the same as "none", which
 * is the cook actively choosing no filter - so the two have to stay apart.
 */
public record SavedRestrictionsDto(String diet, String intolerances) {
    
}
