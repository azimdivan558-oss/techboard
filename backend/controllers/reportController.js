import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";

import JobPost from "../models/JobPost.js";
import JobApplication from "../models/JobApplication.js";

/* =========================================================
   DATE HELPERS
========================================================= */

const parseDate = (value, endOfDay = false) => {
  if (!value) return null;

  const date = new Date(
    `${value}T${
      endOfDay ? "23:59:59.999" : "00:00:00.000"
    }`
  );

  return Number.isNaN(date.getTime()) ? null : date;
};

const buildDateFilter = (
  from,
  to,
  field = "createdAt"
) => {
  const start = parseDate(from);
  const end = parseDate(to, true);

  if (!start && !end) {
    return {};
  }

  return {
    [field]: {
      ...(start ? { $gte: start } : {}),
      ...(end ? { $lte: end } : {}),
    },
  };
};

/* =========================================================
   COMPANY FILTER
========================================================= */

const companyFilter = (req) => {
  if (
    req.user?.role === "company" &&
    req.user?._id
  ) {
    return {
      company: req.user._id,
    };
  }

  return {};
};

/* =========================================================
   JOB REPORT
========================================================= */

export const reportJobs = async (req, res) => {
  try {
    console.log("\n========== JOB REPORT ==========");

    console.log("USER:", req.user?._id);
    console.log("ROLE:", req.user?.role);
    console.log("QUERY:", req.query);

    const filter = {
      ...companyFilter(req),
    };

    // Approval status
    if (
      req.query.status &&
      ["Pending", "Approved", "Rejected"].includes(
        req.query.status
      )
    ) {
      filter.approvalStatus = req.query.status;
    }

    // Date filter
    if (req.query.from || req.query.to) {
      Object.assign(
        filter,
        buildDateFilter(
          req.query.from,
          req.query.to
        )
      );
    }

    console.log("FINAL JOB FILTER:", filter);

    const jobs = await JobPost.find(filter)
      .populate(
        "company",
        "name companyName email"
      )
      .sort({
        createdAt: -1,
      })
      .lean();

    console.log("JOBS FOUND:", jobs.length);

    const ids = jobs.map((job) => job._id);

    let counts = [];

    if (ids.length > 0) {
      counts = await JobApplication.aggregate([
        {
          $match: {
            job: {
              $in: ids,
            },
          },
        },

        {
          $group: {
            _id: "$job",

            applications: {
              $sum: 1,
            },

            selected: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$status",
                      "Selected",
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]);
    }

    const map = new Map(
      counts.map((item) => [
        item._id.toString(),
        item,
      ])
    );

    const rows = jobs.map((job) => {
      const count = map.get(
        job._id.toString()
      );

      return {
        jobId: job._id,

        title: job.title || "",

        company:
          job.company?.companyName ||
          job.company?.name ||
          "Company",

        category: job.category || "",

        location: job.location || "",

        jobType: job.jobType || "",

        approvalStatus:
          job.approvalStatus || "Pending",

        active: job.isActive
          ? "Active"
          : "Inactive",

        views: job.views || 0,

        applications:
          count?.applications || 0,

        selected:
          count?.selected || 0,

        vacancies:
          job.vacancies || 0,

        createdAt: job.createdAt,

        deadline: job.deadline,
      };
    });

    console.log(
      "JOB REPORT ROWS:",
      rows.length
    );

    console.log("================================\n");

    return res.json({
      success: true,
      rows,
      generatedAt: new Date(),
    });
  } catch (error) {
    console.error(
      "JOB REPORT ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Unable to generate job report",
    });
  }
};

/* =========================================================
   APPLICATION REPORT
========================================================= */

export const reportApplications = async (
  req,
  res
) => {
  try {
    console.log(
      "\n========== APPLICATION REPORT =========="
    );

    console.log("USER:", req.user?._id);
    console.log("ROLE:", req.user?.role);
    console.log("QUERY:", req.query);

    const filter = {
      ...companyFilter(req),
    };

    // Job filter
    if (req.query.jobId) {
      filter.job = req.query.jobId;
    }

    // Status filter
    if (req.query.status) {
      filter.status = req.query.status;
    }

    // Date filter
    if (req.query.from || req.query.to) {
      Object.assign(
        filter,
        buildDateFilter(
          req.query.from,
          req.query.to
        )
      );
    }

    console.log(
      "FINAL APPLICATION FILTER:",
      filter
    );

    const applications =
      await JobApplication.find(filter)
        .populate(
          "job",
          "title location jobType"
        )
        .populate(
          "applicant",
          "name email phone location"
        )
        .populate(
          "company",
          "name companyName email"
        )
        .sort({
          createdAt: -1,
        })
        .lean();

    console.log(
      "APPLICATIONS FOUND:",
      applications.length
    );

    const rows = applications.map((a) => ({
      applicationId: a._id,

      applicant:
        a.applicant?.name ||
        "Applicant",

      email:
        a.applicant?.email ||
        "",

      phone:
        a.applicant?.phone ||
        "",

      job:
        a.job?.title ||
        "Deleted Job",

      location:
        a.job?.location ||
        "",

      jobType:
        a.job?.jobType ||
        "",

      company:
        a.company?.companyName ||
        a.company?.name ||
        "Company",

      status:
        a.status ||
        "Pending",

      atsScore:
        a.atsScore ?? 0,

      atsStatus:
        a.atsStatus ||
        "Pending",

      // New Job Match fields
      jobMatchScore:
        a.jobMatchScore ?? 0,

      jobMatchStatus:
        a.jobMatchStatus ||
        "Pending",

      matchedSkills:
        a.matchedSkills || [],

      missingSkills:
        a.missingSkills || [],

      appliedAt:
        a.createdAt,
    }));

    console.log(
      "REPORT ROWS:",
      rows.length
    );

    console.log(
      "=======================================\n"
    );

    return res.json({
      success: true,
      rows,
      generatedAt: new Date(),
    });
  } catch (error) {
    console.error(
      "APPLICATION REPORT ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Unable to generate application report",
    });
  }
};

/* =========================================================
   PDF EXPORT
========================================================= */

const sendPdf = (
  res,
  title,
  columns,
  rows,
  summary
) => {
  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margin: 32,
  });

  res.setHeader(
    "Content-Type",
    "application/pdf"
  );

  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${title
      .replace(/[^a-z0-9]+/gi, "-")
      .toLowerCase()}.pdf"`
  );

  doc.pipe(res);

  doc
    .fontSize(18)
    .fillColor("#111")
    .text(title, {
      align: "center",
    });

  doc.moveDown(0.4);

  doc
    .fontSize(9)
    .fillColor("#666")
    .text(
      `Generated: ${new Date().toLocaleString()}`,
      {
        align: "center",
      }
    );

  doc.moveDown();

  doc
    .fillColor("#111")
    .fontSize(10)
    .text(summary);

  doc.moveDown();

  const pageWidth =
    doc.page.width -
    doc.page.margins.left -
    doc.page.margins.right;

  const widths = columns.map(
    () => pageWidth / columns.length
  );

  let y = doc.y;

  const rowHeight = 24;

  const drawHeader = () => {
    doc
      .rect(
        doc.page.margins.left,
        y,
        pageWidth,
        rowHeight
      )
      .fill("#e9eef5");

    doc
      .fillColor("#111")
      .font("Helvetica-Bold")
      .fontSize(8);

    columns.forEach((column, index) => {
      doc.text(
        column.label,
        doc.page.margins.left +
          widths[index] * index +
          4,
        y + 7,
        {
          width:
            widths[index] - 8,
          ellipsis: true,
        }
      );
    });

    y += rowHeight;

    doc.font("Helvetica");
  };

  drawHeader();

  rows.forEach((row) => {
    if (
      y + rowHeight >
      doc.page.height -
        doc.page.margins.bottom
    ) {
      doc.addPage({
        size: "A4",
        layout: "landscape",
        margin: 32,
      });

      y = doc.page.margins.top;

      drawHeader();
    }

    doc
      .fontSize(7)
      .fillColor("#222");

    columns.forEach(
      (column, index) => {
        const value =
          row[column.key] ?? "";

        let printableValue =
          value;

        if (Array.isArray(value)) {
          printableValue =
            value.join(", ");
        }

        doc.text(
          String(printableValue),
          doc.page.margins.left +
            widths[index] * index +
            4,
          y + 7,
          {
            width:
              widths[index] - 8,
            ellipsis: true,
          }
        );
      }
    );

    doc
      .strokeColor("#ddd")
      .moveTo(
        doc.page.margins.left,
        y + rowHeight
      )
      .lineTo(
        doc.page.margins.left +
          pageWidth,
        y + rowHeight
      )
      .stroke();

    y += rowHeight;
  });

  doc.end();
};

/* =========================================================
   EXCEL EXPORT
========================================================= */

const sendExcel = async (res, title, columns, rows, summary) => {
  try {
    const workbook = new ExcelJS.Workbook();

    workbook.creator = "TechBoard";
    workbook.lastModifiedBy = "TechBoard";
    workbook.created = new Date();
    workbook.modified = new Date();

    const sheet = workbook.addWorksheet("Report");

    // --------------------------------------------------
    // TITLE
    // --------------------------------------------------

    sheet.mergeCells(1, 1, 1, columns.length);

    const titleCell = sheet.getCell(1, 1);
    titleCell.value = title;

    titleCell.font = {
      bold: true,
      size: 18,
    };

    titleCell.alignment = {
      horizontal: "center",
      vertical: "middle",
    };

    sheet.getRow(1).height = 30;

    // --------------------------------------------------
    // SUMMARY
    // --------------------------------------------------

    sheet.mergeCells(2, 1, 2, columns.length);

    const summaryCell = sheet.getCell(2, 1);

    summaryCell.value =
      `Generated: ${new Date().toLocaleString()} | ${summary}`;

    summaryCell.font = {
      size: 10,
      italic: true,
    };

    summaryCell.alignment = {
      horizontal: "left",
      vertical: "middle",
    };

    sheet.getRow(2).height = 22;

    // --------------------------------------------------
    // EMPTY ROW
    // --------------------------------------------------

    sheet.getRow(3).height = 8;

    // --------------------------------------------------
    // HEADER
    // --------------------------------------------------

    const headerRow = sheet.getRow(4);

    headerRow.values = columns.map((column) => column.label);

    headerRow.height = 28;

    headerRow.eachCell((cell) => {
      cell.font = {
        bold: true,
        size: 11,
      };

      cell.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      };

      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
          argb: "E9EEF5",
        },
      };

      cell.border = {
        top: {
          style: "thin",
          color: {
            argb: "D6DCE5",
          },
        },
        bottom: {
          style: "thin",
          color: {
            argb: "D6DCE5",
          },
        },
        left: {
          style: "thin",
          color: {
            argb: "D6DCE5",
          },
        },
        right: {
          style: "thin",
          color: {
            argb: "D6DCE5",
          },
        },
      };
    });

    // --------------------------------------------------
    // DATA
    // --------------------------------------------------

    rows.forEach((row) => {
      const excelRow = sheet.addRow(
        columns.map((column) => {
          const value = row[column.key];

          if (value === null || value === undefined) {
            return "";
          }

          return value;
        })
      );

      excelRow.eachCell((cell) => {
        cell.alignment = {
          vertical: "middle",
          wrapText: true,
        };

        cell.border = {
          bottom: {
            style: "hair",
            color: {
              argb: "E5E9EF",
            },
          },
        };
      });
    });

    // --------------------------------------------------
    // COLUMN WIDTH
    // --------------------------------------------------

    sheet.columns.forEach((column) => {
      let maxLength = 12;

      column.eachCell(
        {
          includeEmpty: true,
        },
        (cell) => {
          const value = cell.value;

          let length = 0;

          if (value !== null && value !== undefined) {
            length = String(value).length;
          }

          maxLength = Math.max(maxLength, length + 2);
        }
      );

      column.width = Math.min(maxLength, 35);
    });

    // --------------------------------------------------
    // FREEZE HEADER
    // --------------------------------------------------

    sheet.views = [
      {
        state: "frozen",
        ySplit: 4,
      },
    ];

    // --------------------------------------------------
    // AUTO FILTER
    // IMPORTANT:
    // ExcelJS needs actual cell addresses here.
    // --------------------------------------------------

    const getExcelColumnName = (number) => {
      let name = "";

      while (number > 0) {
        const remainder = (number - 1) % 26;

        name =
          String.fromCharCode(65 + remainder) +
          name;

        number = Math.floor((number - 1) / 26);
      }

      return name;
    };

    const lastColumn =
      getExcelColumnName(columns.length);

    sheet.autoFilter = {
      from: `A4`,
      to: `${lastColumn}4`,
    };

    // --------------------------------------------------
    // RESPONSE HEADERS
    // --------------------------------------------------

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${title
        .replace(/[^a-z0-9]+/gi, "-")
        .toLowerCase()}.xlsx"`
    );

    // --------------------------------------------------
    // SEND FILE
    // --------------------------------------------------

    await workbook.xlsx.write(res);

    res.end();
  } catch (error) {
    console.error("EXCEL EXPORT ERROR:", error);

    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: error.message || "Excel export failed",
      });
    }

    res.end();
  }
};

/* =========================================================
   APPLICATION COLUMNS
========================================================= */

const applicationColumns = [
  {
    key: "applicant",
    label: "Applicant",
  },

  {
    key: "email",
    label: "Email",
  },

  {
    key: "phone",
    label: "Phone",
  },

  {
    key: "job",
    label: "Job",
  },

  {
    key: "company",
    label: "Company",
  },

  {
    key: "status",
    label: "Status",
  },

  {
    key: "atsScore",
    label: "ATS Score",
  },

  {
    key: "atsStatus",
    label: "ATS Status",
  },

  {
    key: "jobMatchScore",
    label: "Job Match Score",
  },

  {
    key: "jobMatchStatus",
    label: "Job Match Status",
  },

  {
    key: "matchedSkills",
    label: "Matched Skills",
  },

  {
    key: "missingSkills",
    label: "Missing Skills",
  },

  {
    key: "appliedAt",
    label: "Applied At",
  },
];

/* =========================================================
   JOB COLUMNS
========================================================= */

const jobColumns = [
  {
    key: "title",
    label: "Job",
  },

  {
    key: "company",
    label: "Company",
  },

  {
    key: "category",
    label: "Category",
  },

  {
    key: "location",
    label: "Location",
  },

  {
    key: "jobType",
    label: "Type",
  },

  {
    key: "approvalStatus",
    label: "Approval",
  },

  {
    key: "active",
    label: "Active",
  },

  {
    key: "views",
    label: "Views",
  },

  {
    key: "applications",
    label: "Applications",
  },

  {
    key: "selected",
    label: "Selected",
  },

  {
    key: "vacancies",
    label: "Vacancies",
  },

  {
    key: "createdAt",
    label: "Posted At",
  },

  {
    key: "deadline",
    label: "Deadline",
  },
];

/* =========================================================
   EXPORT REPORT
========================================================= */

export const exportReport = async (
  req,
  res
) => {
  try {
    const type =
      req.query.type === "jobs"
        ? "jobs"
        : "applications";

    const format =
      req.query.format === "pdf"
        ? "pdf"
        : "excel";

    let data;

    /*
      We create a fake response object
      so that existing report functions
      can generate the same filtered data.
    */

    const fakeRes = {
      json: (result) => {
        data = result;
      },

      status: () => fakeRes,
    };

    if (type === "jobs") {
      await reportJobs(
        req,
        fakeRes
      );
    } else {
      await reportApplications(
        req,
        fakeRes
      );
    }

    if (!data?.rows) {
      return res.status(500).json({
        success: false,
        message:
          "Unable to build report",
      });
    }

    const columns =
      type === "jobs"
        ? jobColumns
        : applicationColumns;

    const title =
      `TechBoard ${
        type === "jobs"
          ? "Job"
          : "Application"
      } Report`;

    const summary =
      `${data.rows.length} ${type} record(s)`;

    const printableRows =
      data.rows.map((row) => {
        const copy = {
          ...row,
        };

        [
          "createdAt",
          "deadline",
          "appliedAt",
        ].forEach((key) => {
          if (copy[key]) {
            copy[key] =
              new Date(
                copy[key]
              ).toLocaleString();
          }
        });

        return copy;
      });

    if (format === "pdf") {
      return sendPdf(
        res,
        title,
        columns,
        printableRows,
        summary
      );
    }

    return sendExcel(
      res,
      title,
      columns,
      printableRows,
      summary
    );
  } catch (error) {
    console.error(
      "EXPORT REPORT ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Unable to export report",
    });
  }
};