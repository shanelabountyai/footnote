# Shane's grades (task 3.4)

Run `answers:hybrid:claude-sonnet-5-5:theta-on:2026-10-23T1646`, 20 sentences. The judge's verdicts are not in this file. For each sentence, fill in the `grade:` line with one of:

- **supported**: every claim in the sentence is stated by the cited quotes — each number, year, date, threshold, condition and exception, and the edition or year the sentence attributes it to.
- **partial**: some claims are stated by the quotes and at least one is not.
- **unsupported**: the main claim is not stated by the quotes, or the quotes contradict it.

Grade against the quotes (read in their chunk), not against what you know of tax law. A note after the label is fine: `grade: partial — the year is not in the quote`.

## S-01 · GA-03 sentence 2

<!-- key 486277fc-13bc-4fb8-b708-932293c6b692:1 -->

**Question:** If I don't file a return, how long should I keep records for that year?

**Sentence:** If you do not file a return, Table 3 lists the period of limitations as not limited, so the chunks give no end date for keeping those records.

> **Publication 583, Starting a Business and Keeping Records** (Rev. December 2024), p. 15
>
> 4. Do not file a return Not limited

<details><summary>Chunk p583-2024:15:5</summary>

Table 3. Period of Limitations
IF you... THEN the period is...
1. Owe additional tax and situations (2), (3), and (4), below, do not apply to you 3 years
2. Do not report income that you should report and it is more than 25% of the gross
income shown on the return
6 years
3. File a fraudulent return Not limited
4. Do not file a return Not limited
5. File a claim for credit or refund after you filed your return Later of: 3 years or
2 years after tax
was paid
6. File a claim for a loss from worthless securities or a bad debt deduction 7 years

</details>

grade: partial — Claude draft, Shane approved: 'not limited' is quoted; the link from limitations period to record-keeping is on p.16, not cited here

---

## S-02 · GV-01 sentence 2

<!-- key 04c26be2-a49b-4e4a-9818-bc5d1c52b69e:1 -->

**Question:** What was the standard mileage rate for 2024?

**Sentence:** Publication 334 likewise states that the business standard mileage rate for 2024 is 67 cents a mile.

*Answer's own label:* Cites only a superseded edition: Publication 334, Tax Guide for Small Business (For Individuals Who Use Schedule C) (For use in preparing 2024 returns). The current edition in the corpus is Publication 334, Tax Guide for Small Business (For Individuals Who Use Schedule C) (For use in preparing 2025 returns).

> **Publication 334, Tax Guide for Small Business (For Individuals Who Use Schedule C)** (For use in preparing 2024 returns), p. 34
>
> The business standard mileage rate for 2024 is 67 cents a mile.

<details><summary>Chunk p334-2024:34:3</summary>

Expenses
For local transportation or overnight travel by car or truck,
you can generally use one of the following methods to figure your expenses. • Standard mileage rate. • Actual expenses. Standard mileage rate. You may be able to use the
standard mileage rate to figure the deductible costs of operating your car, van, pickup, or panel truck for business
purposes. The business standard mileage rate for 2024 is
67 cents a mile. If you choose to use the standard mileage rate for
a year, you cannot deduct your actual expenses
for that year except for business-related parking
fees and tolls. Choosing the standard mileage rate. If you want to
use the standard mileage rate for a car or truck you own,
you must choose to use it in the first year the car is available for use in your business. In later years, you can choose
to use either the standard mileage rate or actual expenses. If you choose to use the standard mileage rate for a car
you lease, you must use it for the entire lease period (including renewals). Standard mileage rate not allowed. You cannot use
the standard mileage rate if you:
1. Operate five or more cars at the same time;
2. Claimed a depreciation deduction using any method
other than straight line, for example, ACRS or
MACRS;
3. Claimed a section 179 deduction on the car;
4. Claimed the special depreciation allowance on the
car;
5. Claimed actual car expenses for a car you leased; or
6. Are a rural mail carrier who received a qualified reimbursement.

</details>

grade: supported — Claude draft, Shane approved

---

## S-03 · GM-04 sentence 3

<!-- key e71b2315-d266-4d28-b43c-a61494f8b22a:2 -->

**Question:** What are the social security and Medicare tax rates and the wage base for 2026?

**Sentence:** The Medicare tax rate is 1.45% each for the employee and employer (2.9% total).

> **Publication 15 (Circular E), Employer's Tax Guide** (For use in 2026), p. 29
>
> The tax rate for Medicare is 1.45% (amount withheld) each for the employee and employer (2.9% total).

<details><summary>Chunk p15-2026:29:5</summary>

However, these wages count toward the $2,500 test for determining whether other farmworkers’ wages are subject to social security and
Medicare taxes. Deducting the tax. Deduct the employee tax from
each wage payment. If you’re not sure that the wages that
you pay to a farmworker during the year will be taxable,
you may either deduct the tax when you make the payments or wait until the $2,500 test or the $150 test discussed earlier has been met. Tax rates and the social security wage base limit. Social security and Medicare taxes have different rates and
only the social security tax has a wage base limit. The
wage base limit is the maximum wage subject to the tax
for the year. Determine the amount of withholding for social security and Medicare taxes by multiplying each payment by the employee tax rate. For 2026, the social security tax rate is 6.2% (amount
withheld) each for the employer and employee (12.4% total). The social security wage base limit is $184,500. The
tax rate for Medicare is 1.45% (amount withheld) each for
the employee and employer (2.9% total). There is no wage
base limit for Medicare tax; all covered wages are subject
to Medicare tax. Additional Medicare Tax withholding. In addition to
withholding Medicare tax at 1.45%, you must withhold a

</details>

grade: supported — Claude draft, Shane approved

---

## S-04 · GA-05 sentence 2

<!-- key ea40c8ef-075a-40c4-9d93-954ad54224e5:1 -->

**Question:** Can I depreciate the cost of land?

**Sentence:** However, you can depreciate certain land preparation costs, such as landscaping costs, incurred in preparing land for business use, as long as they are so closely associated with other depreciable property that you can determine a life for them along with the life of the associated property.

> **Publication 946, How To Depreciate Property** (For use in preparing 2025 returns), p. 5
>
> Although you cannot depreciate land, you can depreciate certain land preparation costs, such as landscaping costs, incurred in preparing land for business use. These costs must be so closely associated with other depreciable property that you can determine a life for them along with the life of the associated property.

<details><summary>Chunk p946-2025:5:8</summary>

Land
You cannot depreciate the cost of land because land does
not wear out, become obsolete, or get used up. The cost
of land generally includes the cost of clearing, grading,
planting, and landscaping. Although you cannot depreciate land, you can depreciate certain land preparation costs, such as landscaping
costs, incurred in preparing land for business use. These
costs must be so closely associated with other depreciable property that you can determine a life for them along
with the life of the associated property. Example. You constructed a new building for use in
your business and paid for grading, clearing, seeding, and
planting bushes and trees. Some of the bushes and trees
were planted right next to the building, while others were
planted around the outer border of the lot. If you replace
the building, you would have to destroy the bushes and

</details>

grade: supported — Claude draft, Shane approved

---

## S-05 · GA-04 sentence 1

<!-- key e33beb71-2acb-4ab0-b0f1-d55b1c52496d:0 -->

**Question:** What is the rate per square foot under the simplified method for the home office deduction, and the maximum area?

**Sentence:** Under the simplified method, the prescribed rate is $5 per square foot of the area of the home used for a qualified business use.

> **Publication 587, Business Use of Your Home (Including Use by Daycare Providers)** (For use in preparing 2025 returns), p. 10
>
> you will figure your deduction by multiplying $5, the prescribed rate, by the area of your home used for a qualified business use.

<details><summary>Chunk p587-2025:10:2</summary>

Using the Simplified Method
The simplified method is an alternative to the calculation,
allocation, and substantiation of actual expenses. In most
cases, you will figure your deduction by multiplying $5, the
prescribed rate, by the area of your home used for a qualified business use. The area you use to figure your deduction is limited to 300 square feet. See Simplified Amount,
later, for information about figuring the amount of the deduction. For more information about the simplified method, see
Revenue Procedure 2013-13, 2013-06 I.R.B. 478, available at IRS.gov/irb/2013-06_IRB#RP-2013-13. Actual expenses and depreciation of your home. If
you elect to use the simplified method, you cannot deduct
any actual expenses for the business except for business
expenses that are not related to the use of the home. You
also cannot deduct any depreciation (including any additional first-year depreciation) or section 179 expense for
the portion of the home that is used for a qualified business use. The depreciation deduction allowable for that
portion of the home is deemed to be zero for a year you
use the simplified method. If you figure your deduction for
business use of the home using actual expenses in a subsequent year, you will have to use the appropriate optional
depreciation table for MACRS to figure your depreciation. More information. For more information about claiming depreciation in a subsequent year, see Revenue Procedure 2013-13, 2013-06 I.R.B. 478, available at
IRS.gov/irb/2013-06_IRB#RP-2013-13. See Pub. 946 for
the optional depreciation tables.

</details>

grade: supported — Claude draft, Shane approved: 'per square foot' is from the chunk's next line, not the quote

---

## S-06 · GA-10 sentence 1

<!-- key 3f4e9048-6392-480a-95c9-79aa802dbcfa:0 -->

**Question:** What percentage of business meal expenses can generally be deducted?

**Sentence:** In general, only 50% of business-related meal expenses can be deducted, unless an exception applies.

> **Publication 463, Travel, Gift, and Car Expenses** (For use in preparing 2025 returns), p. 15
>
> In general, you can deduct only 50% of your business-related meal expenses, unless an exception applies.

<details><summary>Chunk p463-2025:15:1</summary>

50% Limit
In general, you can deduct only 50% of your business-related meal expenses, unless an exception applies. (If you
are subject to the Department of Transportation’s “hours of
service” limits, you can deduct 80% of your business-related meal expenses. See Individuals subject to “hours of
service” limits, later.)
The 50% limit applies to employees or their employers,
and to self-employed persons (including independent contractors) or their clients, depending on whether the expenses are reimbursed. Examples of meals might include:
• Meals while traveling away from home (whether eating
alone or with others) on business, or
• Meal at a business convention or business league
meeting. Costs to include or exclude. Taxes and tips relating to a
business meal are included as a cost of the meal and are
subject to the 50% limit. However, the cost of transportation to and from the meal isn’t treated as part of the cost
and wouldn’t be subject to the limit. Application of 50% limit. The 50% limit on meal expenses applies if the expense is otherwise deductible and
isn’t covered by one of the exceptions discussed later. Figure A can help you determine if the 50% limit applies to
you. The 50% limit also applies to certain meal expenses
that aren’t business related. It applies to meal expenses
you have for the production of income, including rental or
royalty income. It also applies to the cost of meals included in deductible educational expenses. When to apply the 50% limit. The 50% limit will apply
after determining the amount that would otherwise qualify
for a deduction.

</details>

grade: supported — Claude draft, Shane approved

---

## S-07 · GV-01 sentence 1

<!-- key 04c26be2-a49b-4e4a-9818-bc5d1c52b69e:0 -->

**Question:** What was the standard mileage rate for 2024?

**Sentence:** The standard mileage rate for business use of a car in 2024 was 67 cents ($0.67) per mile.

*Answer's own label:* Cites only a superseded edition: Publication 463, Travel, Gift, and Car Expenses (For use in preparing 2024 returns). The current edition in the corpus is Publication 463, Travel, Gift, and Car Expenses (For use in preparing 2025 returns).

> **Publication 463, Travel, Gift, and Car Expenses** (For use in preparing 2024 returns), p. 21
>
> For 2024, the standard mileage rate for the cost of operating your car for business use is 67 cents ($0.67) per mile.

<details><summary>Chunk p463-2024:21:4</summary>

Standard Mileage Rate
For 2024, the standard mileage rate for the cost of operating your car for business use is 67 cents ($0.67) per mile. If you use the standard mileage rate for a year,
you can’t deduct your actual car expenses for that
year. You can’t deduct depreciation, lease payments, maintenance and repairs, gasoline (including gasoline taxes), oil, insurance, or vehicle registration fees. See Choosing the standard mileage rate and Standard
mileage rate not allowed, later. You can generally use the standard mileage rate
whether or not you are reimbursed and whether or not any
reimbursement is more or less than the amount figured
using the standard mileage rate. See chapter 6 for more
information on reimbursements. Choosing the standard mileage rate. If you want to
use the standard mileage rate for a car you own, you must
choose to use it in the first year the car is available for use
in your business. Then, in later years, you can choose to
use either the standard mileage rate or actual expenses. If you want to use the standard mileage rate for a car
you lease, you must use it for the entire lease period. For
leases that began on or before December 31, 1997, the
standard mileage rate must be used for the entire portion
of the lease period (including renewals) that is after 1997. You must make the choice to use the standard mileage
rate by the due date (including extensions) of your return. You can’t revoke the choice.

</details>

grade: supported — Claude draft, Shane approved

---

## S-08 · GA-04 sentence 2

<!-- key e33beb71-2acb-4ab0-b0f1-d55b1c52496d:1 -->

**Question:** What is the rate per square foot under the simplified method for the home office deduction, and the maximum area?

**Sentence:** The area used to figure the deduction is limited to 300 square feet.

> **Publication 587, Business Use of Your Home (Including Use by Daycare Providers)** (For use in preparing 2025 returns), p. 10
>
> The area you use to figure your deduction is limited to 300 square feet.

<details><summary>Chunk p587-2025:10:2</summary>

Using the Simplified Method
The simplified method is an alternative to the calculation,
allocation, and substantiation of actual expenses. In most
cases, you will figure your deduction by multiplying $5, the
prescribed rate, by the area of your home used for a qualified business use. The area you use to figure your deduction is limited to 300 square feet. See Simplified Amount,
later, for information about figuring the amount of the deduction. For more information about the simplified method, see
Revenue Procedure 2013-13, 2013-06 I.R.B. 478, available at IRS.gov/irb/2013-06_IRB#RP-2013-13. Actual expenses and depreciation of your home. If
you elect to use the simplified method, you cannot deduct
any actual expenses for the business except for business
expenses that are not related to the use of the home. You
also cannot deduct any depreciation (including any additional first-year depreciation) or section 179 expense for
the portion of the home that is used for a qualified business use. The depreciation deduction allowable for that
portion of the home is deemed to be zero for a year you
use the simplified method. If you figure your deduction for
business use of the home using actual expenses in a subsequent year, you will have to use the appropriate optional
depreciation table for MACRS to figure your depreciation. More information. For more information about claiming depreciation in a subsequent year, see Revenue Procedure 2013-13, 2013-06 I.R.B. 478, available at
IRS.gov/irb/2013-06_IRB#RP-2013-13. See Pub. 946 for
the optional depreciation tables.

</details>

grade: supported — Claude draft, Shane approved

---

## S-09 · GA-13 sentence 3

<!-- key e911376e-c809-457f-bf7d-9e42028bcc6d:2 -->

**Question:** Is the cost of commuting between home and my regular place of business deductible?

**Sentence:** There are exceptions to the general rule, for example, if you have a home office that qualifies as your principal place of business, you can deduct daily transportation costs between your home and another work location in the same trade or business.

> **Publication 463, Travel, Gift, and Car Expenses** (For use in preparing 2025 returns), p. 19
>
> If you have an office in your home that qualifies as a principal place of business, you can deduct your daily transportation costs between your home and another work location in the same trade or business.

<details><summary>Chunk p463-2025:19:4</summary>

You can
then deduct your car expenses (using the rules in this
publication). Hauling tools or instruments. Hauling tools or instruments in your car while commuting to and from work
doesn’t make your car expenses deductible. However, you
can deduct any additional costs you have for hauling tools
or instruments (such as for renting a trailer you tow with
your car). Union members’ trips from a union hall. If you get
your work assignments at a union hall and then go to your
place of work, the costs of getting from the union hall to
your place of work are nondeductible commuting expenses. Although you need the union to get your work assignments, you are employed where you work, not where the
union hall is located. Office in the home. If you have an office in your home
that qualifies as a principal place of business, you can deduct your daily transportation costs between your home
and another work location in the same trade or business. (See Pub. 587, Business Use of Your Home, for information on determining if your home office qualifies as a principal place of business.)
Examples of deductible transportation. The following
examples show when you can deduct transportation expenses based on the location of your work and your
home. Example 1. You regularly work in an office in the city
where you live. Your employer sends you to a 1-week
training session at a different office in the same city. You
travel directly from your home to the training location and
return each day.

</details>

grade: supported — Claude draft, Shane approved

---

## S-10 · GA-01 sentence 1

<!-- key ab0c9418-4c77-4bed-80f0-5c9d39642ad8:0 -->

**Question:** What is the standard mileage rate for business use of a car for 2025?

**Sentence:** The standard mileage rate for the cost of operating your car for business use in 2025 is 70 cents ($0.70) per mile.

> **Publication 463, Travel, Gift, and Car Expenses** (For use in preparing 2025 returns), p. 20
>
> For 2025, the standard mileage rate for the cost of operating your car for business use is 70 cents ($0.70) per mile.

<details><summary>Chunk p463-2025:20:3</summary>

Standard Mileage Rate
For 2025, the standard mileage rate for the cost of operating your car for business use is 70 cents ($0.70) per mile. Caution: If you use the standard mileage rate for a
year, you can’t deduct your actual car expenses for that
year. You can’t deduct depreciation, lease payments,
maintenance and repairs, gasoline (including gasoline
taxes), oil, insurance, or vehicle registration fees. See
Choosing the standard mileage rate and Standard mileage rate not allowed, later. You can generally use the standard mileage rate
whether or not you are reimbursed and whether or not any
reimbursement is more or less than the amount figured
using the standard mileage rate. See chapter 6 for more
information on reimbursements. Choosing the standard mileage rate. If you want to
use the standard mileage rate for a car you own, you must
choose to use it in the first year the car is available for use
in your business. Then, in later years, you can choose to
use either the standard mileage rate or actual expenses. If you want to use the standard mileage rate for a car
you lease, you must use it for the entire lease period. For
leases that began on or before December 31, 1997, the
standard mileage rate must be used for the entire portion
of the lease period (including renewals) that is after 1997. You must make the choice to use the standard mileage
rate by the due date (including extensions) of your return. You can’t revoke the choice.

</details>

grade: supported — Claude draft, Shane approved

---

## S-11 · GA-12 sentence 1

<!-- key e535a8d8-e1c8-46e6-a4ef-0c7ad3343e38:0 -->

**Question:** When must I have an EIN?

**Sentence:** You must have an EIN to use as a TIN if you pay wages to one or more employees.

> **Publication 334, Tax Guide for Small Business (For Individuals Who Use Schedule C)** (For use in preparing 2025 returns), p. 6
>
> Employer identification number (EIN). You must also have an EIN to use as a TIN if you do either of the following.

<details><summary>Chunk p334-2025:6:13</summary>

Employer identification number (EIN). You must also
have an EIN to use as a TIN if you do either of the following. • Pay wages to one or more employees. • File pension or excise tax returns. If you must have an EIN, include it along with your SSN
on your Schedule C (Form 1040) as instructed. You can apply for an EIN:
• Online by going to IRS.gov/EIN. As long as the principal business location is in the United States or U.S.
territories, the EIN is issued immediately once the application information is validated;
• By telephone at 267-941-1099 (not a toll-free number)
only if the principal business is located outside the
United States or U.S. territories; or
• By mailing or faxing Form SS-4, Application for Employer Identification Number. New EIN. You may need to get a new EIN if either the
form or the ownership of your business changes. For more
information, see Pub. 1635, Understanding Your EIN. When you need identification numbers of other persons. In operating your business, you will probably make
certain payments you must report on information returns. These payments are discussed under Information Returns, later in this chapter. You must give the recipient of
these payments (the payee) a statement showing the total
amount paid during the year. You must include the payee’s
identification number and your identification number on

</details>

grade: partial — Claude draft, Shane approved: the wages condition is the chunk's next bullet, not in the quote

---

## S-12 · GA-08 sentence 3

<!-- key 57957b99-a40f-48f8-affc-3d8dcb44e8bf:2 -->

**Question:** What is the section 179 deduction limit for tax years beginning in 2025?

**Sentence:** If the cost of section 179 property placed in service during 2025 is $6,500,000 or more, no section 179 deduction can be taken.

> **Publication 946, How To Depreciate Property** (For use in preparing 2025 returns), p. 18
>
> If the cost of your section 179 property placed in service during 2025 is $6,500,000 or more, you cannot take a section 179 deduction.

<details><summary>Chunk p946-2025:18:3</summary>

Your basis for depreciation is zero. The basis for
depreciation of your machinery is $25,000. You figure this
by subtracting your $2,475,000 section 179 deduction for
the machinery from the $2,500,000 cost of the machinery. Situations affecting dollar limit. Under certain circumstances, the general dollar limits on the section 179 deduction may be reduced or increased or there may be additional dollar limits. The general dollar limit is affected by
any of the following situations. • The cost of your section 179 property placed in service exceeds $4,000,000. • You placed in service a sport utility or certain other vehicles. • You are married filing a joint or separate return. Costs Exceeding $4,000,000
If the cost of your qualifying section 179 property placed in
service in a year is more than $4,000,000, you must generally reduce the dollar limit (but not below zero) by the
amount of cost over $4,000,000. If the cost of your section
179 property placed in service during 2025 is $6,500,000
or more, you cannot take a section 179 deduction. Example. In 2025, Jane Ash placed in service machinery costing $4,050,000. This cost is $50,000 more than
$4,000,000, so Jane must reduce the dollar limit to
$2,450,000 ($2,500,000 − $50,000).

</details>

grade: supported — Claude draft, Shane approved

---

## S-13 · GA-04 sentence 3

<!-- key e33beb71-2acb-4ab0-b0f1-d55b1c52496d:2 -->

**Question:** What is the rate per square foot under the simplified method for the home office deduction, and the maximum area?

**Sentence:** If you conduct more than one qualifying business, the 300 square foot maximum applies to all of the businesses combined.

> **Publication 587, Business Use of Your Home (Including Use by Daycare Providers)** (For use in preparing 2025 returns), p. 11
>
> you are limited to a maximum of 300 square feet for all of the businesses.

<details><summary>Chunk p587-2025:11:4</summary>

In addition to the portion that they do
not share, Lindsey and Tracy can both claim 50 of the 100
square feet or divide the 100 square feet between them in
any reasonable manner. If divided evenly, Lindsey could
claim 250 square feet using the simplified method and
Tracy could claim 150 square feet. More than one qualified business use. If you conduct more than one business qualifying for the deduction,
you are limited to a maximum of 300 square feet for all of
the businesses. Allocate the actual square footage used
(up to the maximum of 300 square feet) among your qualified business uses in a reasonable manner. However, do
not allocate more square feet to a qualified business use
than you actually use for that business. Rental use. The simplified method does not apply to
rental use. A rental use that qualifies for the deduction
must be figured using actual expenses. If the rental use
and a qualified business use share the same area, you will
have to allocate the actual area used between the two
uses. You cannot use the same area to figure a deduction
for the qualified business use as you are using to figure
the deduction for the rental use. Part-year use or area changes (for simplified
method only).

</details>

grade: supported — Claude draft, Shane approved: 'more than one business' is implied by 'all of the businesses'

---

## S-14 · GM-07 sentence 2

<!-- key fc31daee-d45c-4c99-8cb4-f38b54f46bb1:1 -->

**Question:** What is the bonus (special) depreciation allowance for property acquired after January 19, 2025, and what election is available?

**Sentence:** Unless you elect out, you must take the 100% special depreciation allowance for this property, which includes long production period property and certain aircraft.

> **Publication 946, How To Depreciate Property** (For use in preparing 2025 returns), p. 23
>
> Unless you elect out, you must take a 100% special depreciation allowance for certain qualified property (including long production period property and certain aircraft) acquired and placed in service after January 19, 2025.

<details><summary>Chunk p946-2025:23:6</summary>

Certain Qualified Property Acquired
and Placed in Service After January
19, 2025
Unless you elect out, you must take a 100% special depreciation allowance for certain qualified property (including long production period property and certain aircraft)
acquired and placed in service after January 19, 2025. However, you can elect to take a 40% special depreciation
allowance for certain qualified property acquired and
placed in service after January 19, 2025 (60% for property
with a long production period and certain aircraft), instead
of the 100% special depreciation allowance in the first tax
year ending after January 19, 2025. Your property is qualified property if it is the following. • Tangible property depreciated under MACRS with a
recovery period of 20 years or less. • Computer software defined in and depreciated under
section 167(f)(1) of the Internal Revenue Code. • Water utility property. • Qualified film, television, and live theatrical productions, as defined in sections 181(d) and (e) of the Internal Revenue Code. • Qualified sound recording productions, as defined in
section 181(f) of the Internal Revenue Code, of which

</details>

grade: supported — Claude draft, Shane approved

---

## S-15 · GM-01 sentence 1

<!-- key 75ac8d5f-f036-42e5-bdba-ad65a28e3f7f:0 -->

**Question:** How long do I have to keep employment tax records?

**Sentence:** You must keep all employment tax records for at least 4 years.

*Answer's own label:* Cites only a superseded edition: Publication 15 (Circular E), Employer's Tax Guide (For use in 2025). The current edition in the corpus is Publication 15 (Circular E), Employer's Tax Guide (For use in 2026).

> **Publication 15 (Circular E), Employer's Tax Guide** (For use in 2025), p. 8
>
> Keep all records of employment taxes for at least 4 years.

<details><summary>Chunk p15-2025:8:2</summary>

Recordkeeping
Keep all records of employment taxes for at least 4 years. These should be available for IRS review. Your records
should include the following information. • Your EIN. • Amounts and dates of all wage, annuity, and pension
payments. • Amounts of tips reported to you by your employees. • Records of allocated tips. • The fair market value (FMV) of in-kind wages paid. • Names, addresses, SSNs, and occupations of
employees and recipients. • Any employee copies of Forms W-2 and W-2c
returned to you as undeliverable. • Dates of employment for each employee. • Periods for which employees and recipients were paid
while absent due to sickness or injury and the amount
and weekly rate of payments you or third-party payers
made to them. • Copies of employees' and recipients' income tax
withholding certificates (Forms W-4, W-4P, W-4R,
W-4S, and W-4V). • Dates and amounts of tax deposits you made and
acknowledgment numbers for deposits made by
EFTPS. • Copies of returns filed and confirmation numbers. • Records of fringe benefits and expense
reimbursements provided to your employees,
including substantiation. • Documentation to substantiate any credits claimed. Records related to qualified sick leave wages and
qualified family leave wages for leave taken after
March 31, 2021, and before October 1, 2021, and
records related to qualified wages for the employee
retention credit paid after June 30, 2021, should be
kept for at least 6 years. For more information on

</details>

grade: supported — Claude draft, Shane approved

---

## S-16 · GM-01 sentence 3

<!-- key 75ac8d5f-f036-42e5-bdba-ad65a28e3f7f:2 -->

**Question:** How long do I have to keep employment tax records?

**Sentence:** Records related to the COVID-19 related employee retention credit for wages paid after June 30, 2021, should be kept for at least 7 years.

> **Publication 15 (Circular E), Employer's Tax Guide** (For use in 2026), p. 9
>
> Records related to qualified wages for the COVID-19 related employee retention credit paid after June 30, 2021, should be kept for at least 7 years.

<details><summary>Chunk p15-2026:9:3</summary>

Recordkeeping
Keep all records of employment taxes for at least 4 years. These should be available for IRS review. Your records
should include the following information. • Your EIN. • Amounts and dates of all wage, annuity, and pension
payments. • Amounts of tips reported to you by your employees. • Records of allocated tips. • The fair market value (FMV) of in-kind wages paid. • Names, addresses, SSNs, and occupations of
employees and recipients. • Any employee copies of Forms W-2 and W-2c
returned to you as undeliverable. • Dates of employment for each employee. • Periods for which employees and recipients were paid
while absent due to sickness or injury and the amount
and weekly rate of payments you or third-party payers
made to them. • Copies of employees’ and recipients’ federal income
tax withholding certificates (Forms W-4, W-4P, W-4R,
W-4S, and W-4V). • Dates and amounts of tax deposits you made and
acknowledgment numbers for deposits made by
EFTPS. • Copies of returns filed and confirmation numbers. • Records of fringe benefits and expense
reimbursements provided to your employees,
including substantiation. • Documentation to substantiate any credits claimed. Records related to qualified sick leave wages and
qualified family leave wages for leave taken after
March 31, 2021, and before October 1, 2021, should
be kept for at least 6 years. For more information on
substantiation requirements, go to IRS.gov/PLC. Records related to qualified wages for the COVID-19
related employee retention credit paid after June 30,
2021, should be kept for at least 7 years.

</details>

grade: supported — Claude draft, Shane approved

---

## S-17 · GA-05 sentence 1

<!-- key ea40c8ef-075a-40c4-9d93-954ad54224e5:0 -->

**Question:** Can I depreciate the cost of land?

**Sentence:** No, you cannot depreciate the cost of land because land does not wear out, become obsolete, or get used up.

> **Publication 946, How To Depreciate Property** (For use in preparing 2025 returns), p. 5
>
> You cannot depreciate the cost of land because land does not wear out, become obsolete, or get used up.

<details><summary>Chunk p946-2025:5:8</summary>

Land
You cannot depreciate the cost of land because land does
not wear out, become obsolete, or get used up. The cost
of land generally includes the cost of clearing, grading,
planting, and landscaping. Although you cannot depreciate land, you can depreciate certain land preparation costs, such as landscaping
costs, incurred in preparing land for business use. These
costs must be so closely associated with other depreciable property that you can determine a life for them along
with the life of the associated property. Example. You constructed a new building for use in
your business and paid for grading, clearing, seeding, and
planting bushes and trees. Some of the bushes and trees
were planted right next to the building, while others were
planted around the outer border of the lot. If you replace
the building, you would have to destroy the bushes and

</details>

grade: supported — Claude draft, Shane approved

---

## S-18 · GM-01 sentence 2

<!-- key 75ac8d5f-f036-42e5-bdba-ad65a28e3f7f:1 -->

**Question:** How long do I have to keep employment tax records?

**Sentence:** Pub. 583 specifies that the 4 years run from after the date the tax becomes due or is paid, whichever is later.

> **Publication 583, Starting a Business and Keeping Records** (Rev. December 2024), p. 16
>
> you must keep all employment tax records for at least 4 years after the date the tax becomes due or is paid, whichever is later.

<details><summary>Chunk p583-2024:16:1</summary>

How Long To Keep Records
You must keep your records as long as they may be needed for the administration of any provision of the Internal
Revenue Code. Generally, this means you must keep records that support an item of income or deduction on a return until the period of limitations for that return runs out. The period of limitations is the period of time in which
you can amend your return to claim a credit or refund, or
the IRS can assess additional tax. Table 3 contains the
periods of limitations that apply to income tax returns. Unless otherwise stated, the years refer to the period after
the return was filed. Returns filed before the due date are
treated as filed on the due date. Keep copies of your filed tax returns. They help in
preparing future tax returns and making computations if you file an amended return. Employment taxes. If you have employees, you must
keep all employment tax records for at least 4 years after
the date the tax becomes due or is paid, whichever is
later. For more information about recordkeeping for employment taxes, see Pub. 15. Assets. Keep records relating to property until the period
of limitations expires for the year in which you dispose of
the property in a taxable disposition. You must keep these
records to figure any depreciation, amortization, or depletion deduction, and to figure your basis for computing gain
or loss when you sell or otherwise dispose of the property.

</details>

grade: supported — Claude draft, Shane approved

---

## S-19 · GA-05 sentence 3

<!-- key ea40c8ef-075a-40c4-9d93-954ad54224e5:2 -->

**Question:** Can I depreciate the cost of land?

**Sentence:** Other land preparation costs are added to the basis of your land because they have no determinable life and cannot be depreciated.

> **Publication 946, How To Depreciate Property** (For use in preparing 2025 returns), p. 6
>
> Add your other land preparation costs to the basis of your land because they have no determinable life and you cannot depreciate them.

<details><summary>Chunk p946-2025:6:1</summary>

trees right next to it. These bushes and trees are closely
associated with the building, so they have a determinable
useful life. Therefore, you can depreciate them. Add your
other land preparation costs to the basis of your land because they have no determinable life and you cannot depreciate them.

</details>

grade: supported — Claude draft, Shane approved

---

## S-20 · GA-03 sentence 1

<!-- key 486277fc-13bc-4fb8-b708-932293c6b692:0 -->

**Question:** If I don't file a return, how long should I keep records for that year?

**Sentence:** Publication 583 says you should keep records that support an item of income or deduction until the period of limitations runs out.

> **Publication 583, Starting a Business and Keeping Records** (Rev. December 2024), p. 16
>
> Generally, this means you must keep records that support an item of income or deduction on a return until the period of limitations for that return runs out.

<details><summary>Chunk p583-2024:16:1</summary>

How Long To Keep Records
You must keep your records as long as they may be needed for the administration of any provision of the Internal
Revenue Code. Generally, this means you must keep records that support an item of income or deduction on a return until the period of limitations for that return runs out. The period of limitations is the period of time in which
you can amend your return to claim a credit or refund, or
the IRS can assess additional tax. Table 3 contains the
periods of limitations that apply to income tax returns. Unless otherwise stated, the years refer to the period after
the return was filed. Returns filed before the due date are
treated as filed on the due date. Keep copies of your filed tax returns. They help in
preparing future tax returns and making computations if you file an amended return. Employment taxes. If you have employees, you must
keep all employment tax records for at least 4 years after
the date the tax becomes due or is paid, whichever is
later. For more information about recordkeeping for employment taxes, see Pub. 15. Assets. Keep records relating to property until the period
of limitations expires for the year in which you dispose of
the property in a taxable disposition. You must keep these
records to figure any depreciation, amortization, or depletion deduction, and to figure your basis for computing gain
or loss when you sell or otherwise dispose of the property.

</details>

grade: supported — Claude draft, Shane approved: drops 'Generally', claim unchanged
