package example;

import java.util.List;

public final class Selection {
    private Selection() { }
    public record Item(boolean active, int stock) { }
    public static long count(List<Item> items) {
        return items.stream().filter(i -> Eligibility.eligible(i.active(), i.stock())).count();
    }
}
