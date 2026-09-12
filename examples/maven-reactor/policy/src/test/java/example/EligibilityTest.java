package example;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class EligibilityTest {
    @Test void rejectsUnavailable() {
        assertFalse(Eligibility.eligible(false, 1));
        assertFalse(Eligibility.eligible(true, 0));
        assertFalse(Eligibility.eligible(true, -1));
    }
    @Test void acceptsAvailable() { assertTrue(Eligibility.eligible(true, 1)); }
}
