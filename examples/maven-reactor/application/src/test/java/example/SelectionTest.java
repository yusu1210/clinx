package example;

import java.util.List;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class SelectionTest {
    @Test void delegatesToSharedPolicy() {
        assertEquals(1, Selection.count(List.of(new Selection.Item(true, 1), new Selection.Item(false, 1), new Selection.Item(true, 0))));
    }
}
