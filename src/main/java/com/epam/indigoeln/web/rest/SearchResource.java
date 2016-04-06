package com.epam.indigoeln.web.rest;

import java.util.Collection;
import java.util.Collections;

import com.epam.indigoeln.web.rest.dto.search.ProductBatchDetailsDTO;
import com.epam.indigoeln.web.rest.dto.search.request.BatchSearchRequestDTO;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import com.epam.indigoeln.core.service.search.SearchServiceAPI;

/**
 * REST Controller for Custom Search Implementation
 */
@RestController
@RequestMapping("/api/search")
public class SearchResource {

    @Autowired
    @Qualifier("commonSearchService")
    private SearchServiceAPI searchService;

    /**
     * POST /batch/formula -> find batch Components by molecular formula
     */
    @RequestMapping(
            value = "/batch/formula",
            method = RequestMethod.POST,
            produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Collection<ProductBatchDetailsDTO>> searchByMolecularStructure(@RequestBody String formula) {

        Collection<ProductBatchDetailsDTO> batchDetails =
                searchService.searchByMolecularFormula(formula, Collections.emptyMap());
        return ResponseEntity.ok(batchDetails);
    }

    /**
     * POST /batch -> find batch Components by specified criteria
     */
    @RequestMapping(
            value = "/batch",
            method = RequestMethod.POST,
            produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Collection<ProductBatchDetailsDTO>> searchByNotebookBatchNumber(
            @RequestBody BatchSearchRequestDTO searchRequest)  {
        Collection<ProductBatchDetailsDTO> batchDetails = searchService.searchBatches(searchRequest);
        return ResponseEntity.ok(batchDetails);
    }

}
